const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `For every action item the user needs to do, generate a brutally specific how-to breakdown. Always include the exact tool or app to open, the exact words to type if using an AI tool like Claude or ChatGPT, the fastest shortcut to complete it, and a realistic time estimate.

Examples:
- If task is complete hackathon — give exact steps including open Lovable, open Loom to record video, open Google Drive to create folder, open Google Form to submit, open LinkedIn to post.
- If task is reply to emails — say open Gmail, search is:unread is:important, reply to top 3 only using one sentence each.
- If task is prepare for meeting — say open Claude.ai, type this exact prompt: help me prepare for a meeting about X, give 5 key points and 3 questions.
- If task is finish a report — say open Claude.ai, paste your notes, ask it to write the report, edit and export as PDF.

Always be this specific. Never say things like 'work on your task' or 'take it step by step' — give the actual steps with actual tool names and actual prompts.

Return ONLY valid JSON with shape: { "breakdowns": [ { "task": string, "estimate": string (e.g. "25 min"), "steps": string[] (3-7 specific steps each naming a real tool/app/prompt) } ] } — one breakdown per input task, in the same order.`;

const buildRequest = (tasks: string[], context: string) => ({
  systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  contents: [{
    role: "user",
    parts: [{ text: `Context from user's mind dump:\n${context}\n\nTasks to break down:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}` }],
  }],
  generationConfig: {
    responseMimeType: "application/json",
    maxOutputTokens: 3072,
    temperature: 0.6,
    responseSchema: {
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
          },
        },
      },
      required: ["breakdowns"],
    },
  },
});

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function callGemini(tasks: string[], context: string, apiKey: string) {
  let lastError = "Gemini API error";
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildRequest(tasks, context)) }
      );
      if (r.ok) return r.json();
      lastError = await r.text();
      console.error("Gemini error:", { model, attempt, status: r.status, body: lastError });
      if (![429, 500, 502, 503, 504].includes(r.status)) break;
      await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
    }
  }
  throw new Error("AI service unavailable. Try again.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tasks, context } = await req.json();
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return new Response(JSON.stringify({ error: "No tasks provided." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    const data = await callGemini(tasks.slice(0, 8), context || "", apiKey);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini.");
    return new Response(text, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("task-breakdown error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
