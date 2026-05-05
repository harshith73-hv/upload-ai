const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a deeply empathetic mental clarity and emotional recovery coach. Read every single word the user wrote. Every output must reference their specific situation, their specific words, and their specific person. Never give generic advice. Be warm, honest, direct, and human. This person is real and they need real help — not a wellness chatbot response.

You will receive:
- A raw mind dump from the user
- A mental load rating from 1 to 10
- The name of one person whose face makes everything worth it for them

Call the unload_response tool with these fields:

1. situation_tag: ONE of "Work Pressure", "Emotional Disconnection", "Relationship Stress", "Financial Anxiety", "Career Confusion", "Physical Exhaustion", "Loneliness", or "Loss of Purpose".
2. todo_today: 3-5 specific numbered action items pulled from EXACTLY what they wrote.
3. let_go: 2-4 specific things outside their control, quoting/paraphrasing their words.
4. root_stress: ONE brutally honest sentence naming the real root cause.
5. open_now: Exactly 3 concrete immediate actions tailored to situation_tag (specific apps, searches, physical actions).
6. person_message: A warm, deeply personal 3-sentence message mentioning [person name] by name, connecting their stress to why this person matters.
7. recovery_plan: { tonight, tomorrow_morning, tomorrow_afternoon } — each one gentle 1-2 sentence nudge from a caring friend referencing their situation.
8. grounding_question: ONE personalised grounding question they can sit with for 60 seconds.
9. intention: ONE personalised intention starting "For the next hour, I will…" referencing their specific situation.`;

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

const tool = {
  type: "function",
  function: {
    name: "unload_response",
    description: "Return a structured empathetic recovery plan.",
    parameters: {
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
          additionalProperties: false,
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
      additionalProperties: false,
    },
  },
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Mental load rating: ${safeLoad}/10\nPerson who matters most to me: ${safePerson}\n\nMy mind dump:\n\n${dump}`,
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "unload_response" } },
      }),
    });

    if (!aiResp.ok) {
      const body = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, body);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests right now. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("The AI service is temporarily unavailable. Please try again.");
    }

    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No structured response from AI.");
    const parsed = JSON.parse(args);

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
