const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReviewReplyRequest = {
  type?: string;
  businessName?: string;
  niche?: string;
  rating?: number;
  review?: string;
  tone?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extractOutputText(data: any) {
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item: any) => item.content || [])
    .map((content: any) => content.text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

Deno.serve(async (request) => {
  try {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY is not configured on the server" }, 503);
    }

    const payload = await request.json().catch(() => null) as ReviewReplyRequest | null;
    if (!payload || payload.type !== "review_reply") {
      return jsonResponse({ error: "Unsupported request type" }, 400);
    }

    const businessName = String(payload.businessName || "the business").slice(0, 90);
    const niche = String(payload.niche || "local service business").slice(0, 80);
    const rating = Number(payload.rating || 5);
    const review = String(payload.review || "").slice(0, 1200);
    const tone = String(payload.tone || "warm").slice(0, 30);

    if (!review.trim()) {
      return jsonResponse({ error: "Review text is required" }, 400);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-5.4-mini",
        instructions: [
          "You write natural review replies for small local service businesses.",
          "Avoid generic AI phrases like 'we value your feedback' unless the review is negative.",
          "Mention one concrete detail from the review when possible.",
          "Keep the reply under 75 words.",
          "Do not promise refunds, discounts, medical outcomes, legal results, or anything not stated by the business.",
        ].join(" "),
        input: `Business: ${businessName}
Industry: ${niche}
Rating: ${rating}/5
Tone: ${tone}
Customer review: ${review}

Write one reply from the business owner. Make it specific, human, and ready to paste.`,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResponse({ error: data.error?.message || "OpenAI request failed" }, response.status);
    }

    const text = extractOutputText(data);
    if (!text) {
      return jsonResponse({ error: "No text returned from OpenAI" }, 502);
    }

    return jsonResponse({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected function error";
    console.error(message);
    return jsonResponse({ error: message }, 502);
  }
});
