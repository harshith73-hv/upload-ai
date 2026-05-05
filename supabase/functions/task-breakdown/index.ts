const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `For every action item the user needs to do, generate a brutally specific how-to breakdown. Always include the exact tool or app to open, the exact words to type if using an AI tool like Claude or ChatGPT, the fastest shortcut to complete it, and a realistic time estimate.

Examples:
- complete hackathon → open Lovable, open Loom to record video, open Google Drive, open Google Form to submit, open LinkedIn to post.
- reply to emails → open Gmail, search is:unread is:important, reply to top 3 only with one sentence each.
- prepare for meeting → open Claude.ai, type: "help me prepare for a meeting about X, give 5 key points and 3 questions".

Always be this specific. Never say "work on your task" — give actual steps with actual tool names and prompts.

Call the task_breakdowns tool with one breakdown per input task, in the same order.`;

const tools = [{
  type: "function",
  function: {
    name: "task_breakdowns",
    description: "Return step-by-step breakdowns for each task.",
    parameters: {
      type: "object",
      properties: {
        breakdowns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              task: { type: "string" },
              estimate: { type: "string" },
              steps: { type: "array", items: { type: "string" } },
            },
            required: ["task", "estimate", "steps"],
            additionalProperties: false,
          },
        },
      },
      required: ["breakdowns"],
      additionalProperties: false,
    },
  },
}];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tasks, context } = await req.json();
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return new Response(JSON.stringify({ error: "No tasks provided." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const trimmed = tasks.slice(0, 8);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Context from user's mind dump:\n${context || ""}\n\nTasks to break down:\n${trimmed.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "task_breakdowns" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable AI workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await response.text();
      console.error("AI gateway error:", response.status, body);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No structured response from AI.");
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("task-breakdown error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
