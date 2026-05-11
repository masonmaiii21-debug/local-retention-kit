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

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function analyzeReview({ rating, review }: { rating: number; review: string }) {
  const lower = review.toLowerCase();
  const signals = [
    {
      type: "Pet care concern",
      severity: "high",
      keys: ["hurt", "injured", "injury", "cut my dog", "cut my pet", "nicked", "scratch", "scratched", "bleeding", "burn", "rash", "vet", "rough", "unsafe", "traumatized", "limping"],
      detail: "your concern about your pet's comfort and safety",
    },
    {
      type: "Grooming quality",
      severity: "medium",
      keys: ["bad haircut", "uneven", "too short", "shaved", "patchy", "missed spots", "dirty", "not clean", "smell", "not what i asked", "ignored instructions", "wrong cut"],
      detail: "the grooming result not matching expectations",
    },
    {
      type: "Scheduling issue",
      severity: "medium",
      keys: ["late", "wait", "waiting", "delayed", "rescheduled", "cancelled", "canceled", "appointment", "booking"],
      detail: "the scheduling or wait-time experience",
    },
    {
      type: "Pricing concern",
      severity: "medium",
      keys: ["expensive", "overcharged", "price", "cost", "charge", "fee"],
      detail: "your concern about pricing",
    },
    {
      type: "Staff experience",
      severity: "medium",
      keys: ["rude", "unfriendly", "ignored", "attitude", "not helpful", "dismissive"],
      detail: "the way the interaction with our team felt",
    },
    {
      type: "Pet comfort",
      severity: "low",
      keys: ["nervous", "anxious", "scared", "shy", "senior dog", "puppy"],
      detail: "your pet feeling comfortable during the visit",
    },
    {
      type: "Positive service",
      severity: "low",
      keys: ["friendly", "kind", "great", "amazing", "love", "loved", "patient", "clean", "fresh", "beautiful", "perfect", "happy"],
      detail: "the visit feeling smooth and positive",
    },
  ];
  const negativeWords = ["bad", "terrible", "awful", "worst", "disappointed", "upset", "not happy", "poor", "never again", "refund", "complaint"];
  const positiveWords = ["great", "amazing", "love", "loved", "friendly", "kind", "happy", "perfect", "excellent", "recommend"];
  const matched = signals.filter((signal) => includesAny(lower, signal.keys));
  const hasHighRiskIssue = matched.some((signal) => signal.severity === "high");
  const hasNegativeText = includesAny(lower, negativeWords) || matched.some((signal) => signal.severity === "high" || (signal.severity === "medium" && signal.type !== "Pet comfort"));
  const hasPositiveText = includesAny(lower, positiveWords) || matched.some((signal) => signal.type === "Positive service");
  const primary = matched.find((signal) => signal.severity === "high")
    || matched.find((signal) => signal.severity === "medium")
    || matched[0]
    || { type: "General feedback", severity: "low", detail: "the details of your visit" };

  let sentiment = "positive";
  if (hasHighRiskIssue || rating <= 2 || (hasNegativeText && !hasPositiveText)) {
    sentiment = "negative";
  } else if (rating === 3 || hasNegativeText) {
    sentiment = "mixed";
  }

  return {
    sentiment,
    issueType: primary.type,
    severity: primary.severity,
    detail: primary.detail,
  };
}

function buildFallbackReviewReply({ businessName, rating, review, tone }: {
  businessName: string;
  rating: number;
  review: string;
  tone: string;
}) {
  const insight = analyzeReview({ rating, review });
  const business = businessName || "our team";
  const short = tone === "Short";

  if (insight.sentiment === "negative") {
    if (short) {
      return `Thank you for telling us. I am sorry the visit with ${business} fell short, especially around ${insight.detail}. Please contact us directly so we can understand what happened and make the next step right.`;
    }
    return `Thank you for being honest about your experience. I am sorry the visit with ${business} did not meet the standard we aim for, especially around ${insight.detail}. Please contact us directly so we can understand what happened, review it with the team, and make the next step right.`;
  }

  if (insight.sentiment === "mixed") {
    return `Thank you for taking the time to share this. I appreciate you mentioning ${insight.detail}; that helps ${business} understand what went well and what we should tighten up. We will review this with the team and keep improving.`;
  }

  if (short) {
    return `Thank you for the kind review. We are glad ${insight.detail} stood out, and we appreciate you choosing ${business}.`;
  }

  return `Thank you so much for the thoughtful review. We are glad ${insight.detail} stood out, and we really appreciate you choosing ${business}. We hope to see you again soon.`;
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
    const insight = analyzeReview({ rating, review });
    if (!apiKey) {
      return jsonResponse({
        text: fallbackText,
        insight,
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
          "First classify the review sentiment from the review text and rating: positive, mixed, or negative.",
          "If the review contains complaints, safety concerns, pet discomfort, rude service, price concerns, or scheduling issues, acknowledge that specific issue and do not use a generic positive reply even if the rating is high.",
          "Avoid generic AI phrases like 'we value your feedback' unless the review is negative.",
          "Mention one concrete detail from the review when possible.",
          "Keep the reply under 75 words.",
          "Do not promise refunds, discounts, medical outcomes, legal results, or anything not stated by the business.",
        ].join(" "),
        input: `Business: ${businessName}
Industry: ${niche}
Rating: ${rating}/5
Tone: ${tone}
Detected sentiment: ${insight.sentiment}
Detected issue: ${insight.issueType}
Severity: ${insight.severity}
Customer review: ${review}

Write one reply from the business owner. Make it specific, human, and ready to paste.`,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error(data.error?.message || "OpenAI request failed");
      return jsonResponse({
        text: fallbackText,
        insight,
        source: "fallback",
        warning: data.error?.message || "OpenAI request failed",
      });
    }

    const text = extractOutputText(data);
    if (!text) {
      return jsonResponse({
        text: fallbackText,
        insight,
        source: "fallback",
        warning: "No text returned from OpenAI",
      });
    }

    return jsonResponse({ text, insight, source: "openai" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected function error";
    console.error(message);
    return jsonResponse({ error: message }, 502);
  }
});
