const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a deeply empathetic mental clarity and emotional recovery coach. Read every single word the user wrote. Every output must reference their specific situation, their specific words, and their specific person. Never give generic advice. Be warm, honest, direct, and human. This person is real and they need real help — not a wellness chatbot response.

You will receive:
- A raw mind dump from the user
- A mental load rating from 1 to 10
- The name of one person whose face makes everything worth it for them

Your job is to return a structured JSON response with these fields:

1. situation_tag: ONE of exactly these labels that best matches their dump — "Work Pressure", "Emotional Disconnection", "Relationship Stress", "Financial Anxiety", "Career Confusion", "Physical Exhaustion", "Loneliness", or "Loss of Purpose".

2. todo_today: 3 to 5 specific numbered action items pulled from EXACTLY what they wrote. Reference their actual deadlines, people, tasks. Never generic.

3. let_go: 2 to 4 specific things they mentioned that are outside their control. Quote or paraphrase their actual words.

4. root_stress: ONE brutally honest sentence naming the real root cause based on their exact words. Direct, not soft. Name the truth underneath.

5. open_now: Exactly 3 specific immediate actions tailored to the situation_tag. Each action should be concrete — name specific apps, specific searches, specific physical actions. Examples by category:
   - Work Pressure: block 90 minutes in your calendar for [their specific task], open a Lo-Fi focus playlist on Spotify, write a 3-item priority list for tomorrow.
   - Emotional Disconnection: send a 30 second voice note to [person name], open your camera roll and look at one photo of [person], step outside for 7 minutes without your phone.
   - Loneliness: search YouTube for "comfort vlog [their interest]", text [person name] one specific question, write down 3 things you actually like about yourself.
   - Adapt similarly for other tags using THEIR specifics.

6. person_message: A warm, deeply personal 3-sentence message TO the user, mentioning [person name] by name. Connect their specific stress (from their dump) to why this person matters. Remind them why they keep going. Use their exact situation. Not a Hallmark card — real and specific.

7. recovery_plan: An object with three keys — "tonight", "tomorrow_morning", "tomorrow_afternoon". Each is one gentle 1-2 sentence nudge written like a caring friend, NOT a rigid schedule. Reference their specific situation.

8. grounding_question: ONE personalised grounding question for them based on their situation. Something they can sit with for 60 seconds. Specific to what they wrote.

9. intention: ONE personalised intention statement for the next hour. Starts with "For the next hour, I will…" and references their specific situation.

Return ONLY valid JSON matching the schema. No prose outside JSON.`;

const SITUATION_TAGS = [
  "Work Pressure",
  "Emotional Disconnection",
  "Relationship Stress",
  "Financial Anxiety",
  "Career Confusion",
  "Physical Exhaustion",
  "Loneliness",
  "Loss of Purpose",
];

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

const buildGeminiRequest = (dump: string, load: number, person: string) => ({
  systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  contents: [
    {
      role: "user",
      parts: [
        {
          text: `Mental load rating: ${load}/10\nPerson who matters most to me: ${person}\n\nMy mind dump:\n\n${dump}`,
        },
      ],
    },
  ],
  generationConfig: {
    responseMimeType: "application/json",
    maxOutputTokens: 3072,
    temperature: 0.7,
    responseSchema: {
      type: "object",
      properties: {
        situation_tag: { type: "string", enum: SITUATION_TAGS },
        todo_today: { type: "array", items: { type: "string" } },
        let_go: { type: "array", items: { type: "string" } },
        root_stress: { type: "string" },
        open_now: { type: "array", items: { type: "string" } },
        person_message: { type: "string" },
        recovery_plan: {
          type: "object",
          properties: {
            tonight: { type: "string" },
            tomorrow_morning: { type: "string" },
            tomorrow_afternoon: { type: "string" },
          },
          required: ["tonight", "tomorrow_morning", "tomorrow_afternoon"],
        },
        grounding_question: { type: "string" },
        intention: { type: "string" },
      },
      required: [
        "situation_tag",
        "todo_today",
        "let_go",
        "root_stress",
        "open_now",
        "person_message",
        "recovery_plan",
        "grounding_question",
        "intention",
      ],
    },
  },
});

async function callGemini(dump: string, load: number, person: string, apiKey: string) {
  let lastError = "Gemini API error";
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildGeminiRequest(dump, load, person)),
        }
      );
      if (response.ok) return response.json();
      const body = await response.text();
      lastError = body;
      console.error("Gemini error:", { model, attempt: attempt + 1, status: response.status, body });
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error("The AI could not process that request. Please try rephrasing it.");
      }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error(
    lastError.includes("high demand")
      ? "The AI is busy right now. Please try again in a moment."
      : "The AI service is temporarily unavailable. Please try again."
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dump, load, person } = await req.json();
    if (!dump || typeof dump !== "string" || dump.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please write something first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safeLoad = typeof load === "number" && load >= 1 && load <= 10 ? load : 5;
    const safePerson = typeof person === "string" && person.trim().length > 0 ? person.trim() : "someone you love";

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const data = await callGemini(dump, safeLoad, safePerson, GEMINI_API_KEY);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini.");
    const parsed = JSON.parse(text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("unload error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
