const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a deeply empathetic mental clarity coach. The user is going to share their raw unfiltered thoughts. Read every word carefully. Your response must feel like it was written specifically for this person and this situation only. Never give generic advice. Card 1 — extract specific real action items from exactly what they wrote, not general suggestions. Card 2 — identify specific things they mentioned that are outside their control and name them directly. Card 3 — write one honest, specific sentence that names the real root cause based on their exact words. Card 4 — write one powerful grounding statement that speaks directly to their specific situation. Be warm, human, and direct.

Return JSON with keys: actions (array of strings for Card 1), release (array of strings for Card 2), rootStress (string for Card 3), groundingStatement (string for Card 4).`;

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

const buildGeminiRequest = (dump: string) => ({
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
    maxOutputTokens: 2048,
    temperature: 0.65,
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
});

async function callGemini(dump: string, apiKey: string) {
  let lastError = "Gemini API error";

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildGeminiRequest(dump)),
        }
      );

      if (response.ok) return response.json();

      const body = await response.text();
      lastError = body;
      console.error("Gemini error:", { model, attempt: attempt + 1, status: response.status, body });

      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error("The AI could not process that request. Please try rephrasing it.");
      }

      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw new Error(lastError.includes("high demand") ? "The AI is busy right now. Please try again in a moment." : "The AI service is temporarily unavailable. Please try again.");
}

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
    const data = await callGemini(dump, GEMINI_API_KEY);
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
