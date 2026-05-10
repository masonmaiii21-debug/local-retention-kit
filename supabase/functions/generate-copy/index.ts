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

function detailFromReview(review: string) {
  const lower = review.toLowerCase();
  const checks = [
    { keys: ["nervous", "anxious", "scared"], detail: "being patient and gentle" },
    { keys: ["haircut", "cut", "trim"], detail: "the haircut looking great" },
    { keys: ["dog", "puppy", "cat", "pet"], detail: "trusting us with your pet" },
    { keys: ["clean", "fresh"], detail: "how clean and fresh everything felt" },
    { keys: ["friendly", "kind", "nice"], detail: "the team being friendly" },
    { keys: ["quick", "fast", "on time"], detail: "keeping the visit easy and on time" },
    { keys: ["price", "expensive", "cost"], detail: "sharing your thoughts on pricing" },
    { keys: ["schedule", "appointment", "booking"], detail: "the booking experience" },
  ];

  return checks.find((item) => item.keys.some((key) => lower.includes(key)))?.detail || "sharing the details of your visit";
}

function buildFallbackReviewReply({ businessName, rating, review, tone }: {
  businessName: string;
  rating: number;
  review: string;
  tone: string;
}) {
  const detail = detailFromReview(review);
  const business = businessName || "our team";
  const warmClose = tone === "简短" ? "" : " We hope to see you again soon.";

  if (rating <= 2) {
    return `Thank you for telling us about this. I am sorry the visit with ${business} did not feel right, especially around ${detail}. Please contact us directly so I can understand what happened and help make the next step clearer.`;
  }

  if (rating === 3) {
    return `Thank you for the honest review. I appreciate you mentioning ${detail}; that helps ${business} understand what worked and what we can improve. We will keep tightening the experience for future visits.`;
  }

  if (tone === "简短") {
    return `Thank you for the kind review. We really appreciate you mentioning ${detail}, and we are glad ${business} could make the visit a good one.`;
  }

  return `Thank you so much for the thoughtful review. I am glad ${detail} stood out, and we really appreciate you choosing ${business}.${warmClose}`;
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

    const fallbackText = buildFallbackReviewReply({ businessName, rating, review, tone });
    if (!apiKey) {
      return jsonResponse({
        text: fallbackText,
        source: "fallback",
        warning: "OPENAI_API_KEY is not configured on the server",
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
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
      console.error(data.error?.message || "OpenAI request failed");
      return jsonResponse({
        text: fallbackText,
        source: "fallback",
        warning: data.error?.message || "OpenAI request failed",
      });
    }

    const text = extractOutputText(data);
    if (!text) {
      return jsonResponse({
        text: fallbackText,
        source: "fallback",
        warning: "No text returned from OpenAI",
      });
    }

    return jsonResponse({ text, source: "openai" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected function error";
    console.error(message);
    return jsonResponse({ error: message }, 502);
  }
});
