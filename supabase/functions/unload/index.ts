const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a deeply empathetic mental clarity coach — part therapist, part wise friend. A person is about to share the raw contents of their mind with you. Your job is to read what they actually wrote — the specific people, jobs, fears, dates, relationships, and words they used — and reflect it back with precision and warmth.

CRITICAL RULES:
1. NEVER be generic. Never use phrases like "your responsibilities", "various tasks", "things on your plate", "personal matters". Always name the actual thing the user mentioned (e.g. "the email to Sarah", "the Tuesday deadline", "the conversation with your mom you've been avoiding").
2. Quote or paraphrase their own words when possible. They should feel seen, not processed.
3. Match their emotional register. If they're panicking, be steady. If they're numb, be gentle. If they're angry, validate before redirecting.
4. Be direct but tender. No corporate wellness language. No toxic positivity. No "just breathe" platitudes.

Return JSON with these 4 sections, all grounded in what they specifically wrote:

- actions: 3 to 5 concrete things to actually do today, drawn directly from their dump. Each one starts with a verb and names the specific person/task/thing. Order by what will give the most relief first.
- release: 2 to 4 things they're carrying that aren't theirs to carry today — things outside their control, future hypotheticals, or other people's feelings. Name them specifically.
- rootStress: One sentence naming the real underlying fear or unmet need beneath the surface noise. Not the symptom — the source. Speak to them in second person ("You're not afraid of the deadline, you're afraid of...").
- groundingStatement: One short, beautiful sentence (under 20 words) they can say to themselves right now. Specific to their situation, not a generic affirmation. It should feel like it was written for them alone.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dump } = await req.json();
    if (!dump || typeof dump !== "string" || dump.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Please write something first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: `Here is my mind dump:\n\n${dump}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                actions: { type: "array", items: { type: "string" } },
                release: { type: "array", items: { type: "string" } },
                rootStress: { type: "string" },
                groundingStatement: { type: "string" },
              },
              required: ["actions", "release", "rootStress", "groundingStatement"],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Gemini API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini.");
    const parsedRaw = JSON.parse(text);

    // Map to the keys the frontend expects.
    const parsed = {
      todo_today: parsedRaw.actions ?? [],
      let_go: parsedRaw.release ?? [],
      root_stress: parsedRaw.rootStress ?? "",
      grounding_statement: parsedRaw.groundingStatement ?? "",
    };

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
