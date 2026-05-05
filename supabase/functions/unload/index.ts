const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a deeply empathetic mental clarity coach. The user is going to share their raw unfiltered thoughts. Read every word carefully. Your response must feel like it was written specifically for this person and this situation only. Never give generic advice. Card 1 — extract specific real action items from exactly what they wrote, not general suggestions. Card 2 — identify specific things they mentioned that are outside their control and name them directly. Card 3 — write one honest, specific sentence that names the real root cause based on their exact words. Card 4 — write one powerful grounding statement that speaks directly to their specific situation. Be warm, human, and direct.`;

const tools = [
  {
    type: "function",
    function: {
      name: "return_unload_result",
      description: "Return the structured mental unload result.",
      parameters: {
        type: "object",
        properties: {
          actions: { type: "array", items: { type: "string" } },
          release: { type: "array", items: { type: "string" } },
          rootStress: { type: "string" },
          groundingStatement: { type: "string" },
        },
        required: ["actions", "release", "rootStress", "groundingStatement"],
        additionalProperties: false,
      },
    },
  },
];

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Here is my mind dump:\n\n${dump}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "return_unload_result" } },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("AI gateway error:", response.status, body);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests right now. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("The AI service is temporarily unavailable. Please try again.");
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) throw new Error("No structured response from AI.");
    const parsedRaw = JSON.parse(argsStr);

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
