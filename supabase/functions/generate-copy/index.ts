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

function detectReviewLanguage(review: string) {
  if (/[\u4e00-\u9fff]/.test(review)) return "Chinese";
  if (/[\u3040-\u30ff]/.test(review)) return "Japanese";
  if (/[\uac00-\ud7af]/.test(review)) return "Korean";
  if (/[áéíóúñ¿¡]/i.test(review)) return "Spanish";
  if (/[àâçéèêëîïôûùüÿœ]/i.test(review)) return "French";
  if (/[äöüß]/i.test(review)) return "German";
  return "English or unknown";
}

function reviewRecommendedAction({ sentiment, issueType }: { sentiment: string; issueType: string }) {
  if (issueType === "Pet care concern") return "Escalate privately before replying";
  if (issueType === "Abusive or angry feedback") return "Acknowledge frustration calmly";
  if (sentiment === "negative") return "Apologize and invite direct contact";
  if (sentiment === "mixed") return "Acknowledge both sides and improve";
  if (sentiment === "neutral") return "Thank them without overpraising";
  return "Thank them and reinforce the good experience";
}

function analyzeReview({ rating, review }: { rating: number; review: string }) {
  const lower = review.toLowerCase();
  const searchText = `${lower} ${lower.replace(/[\s+*._\-#@!?,;:'"~|\\/()[\]{}，。！？、]+/g, "")}`;
  const sentimentText = searchText
    .replaceAll("not bad", "")
    .replaceAll("差不多", "");
  const positiveText = searchText
    .replaceAll("not happy", "")
    .replaceAll("not professional", "")
    .replaceAll("not friendly", "")
    .replaceAll("不专业", "")
    .replaceAll("不友好", "")
    .replaceAll("不满意", "")
    .replaceAll("不好", "");
  const signals = [
    {
      type: "Pet care concern",
      severity: "high",
      keys: [
        "hurt", "injured", "injury", "cut my dog", "cut my pet", "nicked", "scratch", "scratched", "bleeding", "burn", "rash", "vet", "rough", "unsafe", "traumatized", "limping",
        "受伤", "弄伤", "流血", "划伤", "割伤", "不安全", "吓坏", "一瘸一拐", "去看兽医",
        "lastimado", "herido", "sangrando", "inseguro", "veterinario",
        "blesse", "blessé", "saigne", "dangereux", "veterinaire", "vétérinaire",
        "verletzt", "blutet", "unsicher", "tierarzt",
        "怪我", "出血", "危険", "獣医",
        "다쳤", "피가", "위험", "동물병원",
      ],
      detail: "your concern about your pet's comfort and safety",
    },
    {
      type: "Abusive or angry feedback",
      severity: "medium",
      keys: [
        "idiot", "stupid", "trash", "garbage", "scam", "fraud", "ripoff", "useless", "motherfucker",
        "傻逼", "傻比", "垃圾", "骗子", "恶心", "坑", "坑钱", "滚", "废物", "无语", "你妈", "你媽", "他妈", "他媽", "妈的", "媽的", "草你", "操你", "卧槽", "我操", "cnm", "nmsl", "sb", "shabi",
        "idiota", "basura", "estafa", "inutil", "inútil",
        "arnaque", "nul", "nulle", "ordure",
        "dumm", "betrug", "müll", "muell",
        "馬鹿", "バカ", "詐欺", "ゴミ",
        "멍청", "쓰레기", "사기",
      ],
      detail: "the frustration expressed in the review",
    },
    {
      type: "Grooming quality",
      severity: "medium",
      keys: [
        "bad haircut", "uneven", "too short", "shaved", "patchy", "missed spots", "dirty", "not clean", "smell", "not what i asked", "ignored instructions", "wrong cut",
        "剪坏", "剪得太短", "剃太短", "不均匀", "没洗干净", "很脏", "臭", "不是我要的",
        "mal corte", "corte malo", "desigual", "sucio", "olor",
        "mauvaise coupe", "sale", "odeur", "trop court",
        "schlechter schnitt", "ungleich", "schmutzig", "zu kurz",
        "カットが悪い", "汚い", "臭い", "短すぎ",
        "엉망", "더러", "냄새", "너무 짧",
      ],
      detail: "the grooming result not matching expectations",
    },
    {
      type: "Scheduling issue",
      severity: "medium",
      keys: [
        "late", "wait", "waiting", "delayed", "rescheduled", "cancelled", "canceled", "appointment", "booking",
        "迟到", "等太久", "等了很久", "延迟", "取消", "改时间", "预约",
        "tarde", "espera", "esperando", "retraso", "cancelado", "cita", "reserva",
        "retard", "attente", "annule", "annulé", "rendez-vous",
        "spät", "spaet", "warte", "verspätet", "verspaetet", "termin",
        "遅い", "待った", "予約", "キャンセル",
        "늦", "기다", "예약", "취소",
      ],
      detail: "the scheduling or wait-time experience",
    },
    {
      type: "Pricing concern",
      severity: "medium",
      keys: [
        "expensive", "overcharged", "price", "cost", "charge", "fee",
        "太贵", "贵", "乱收费", "收费", "价格", "不值",
        "caro", "costoso", "cobro", "precio",
        "cher", "trop cher", "prix", "facture",
        "teuer", "preis", "kosten",
        "高い", "料金", "価格",
        "비싸", "가격", "요금",
      ],
      detail: "your concern about pricing",
    },
    {
      type: "Staff experience",
      severity: "medium",
      keys: [
        "rude", "unfriendly", "ignored", "attitude", "not helpful", "not professional", "not friendly", "dismissive",
        "态度差", "不礼貌", "没礼貌", "冷漠", "不专业", "不理人",
        "grosero", "maleducado", "antipatico", "antipático", "poco profesional",
        "impoli", "désagréable", "desagreable", "pas professionnel",
        "unfreundlich", "unhöflich", "unhoeflich", "unprofessionell",
        "失礼", "態度悪い", "不親切",
        "불친절", "무례", "태도",
      ],
      detail: "the way the interaction with our team felt",
    },
    {
      type: "Pet comfort",
      severity: "low",
      keys: ["nervous", "anxious", "scared", "shy", "senior dog", "puppy"],
      detail: "your pet feeling comfortable during the visit",
    },
    {
      type: "Suggestion",
      severity: "low",
      keys: ["could be", "could have", "would be nice", "wish", "suggest", "suggestion", "maybe next time", "next time", "should offer", "should add"],
      detail: "your suggestion for making the experience better",
    },
    {
      type: "Neutral experience",
      severity: "low",
      keys: ["okay", "fine", "average", "normal", "standard", "as expected", "nothing special", "decent", "alright", "not bad"],
      detail: "the visit feeling straightforward",
    },
    {
      type: "Uncertain feedback",
      severity: "low",
      keys: ["not sure", "maybe", "i think", "seems", "probably", "mostly", "overall"],
      detail: "your honest note about the visit",
    },
    {
      type: "Positive service",
      severity: "low",
      keys: ["friendly", "kind", "great", "amazing", "love", "loved", "patient", "clean", "fresh", "beautiful", "perfect", "happy"],
      detail: "the visit feeling smooth and positive",
    },
  ];
  const negativeWords = [
    "bad", "terrible", "awful", "worst", "disappointed", "upset", "not happy", "not professional", "not friendly", "poor", "never again", "refund", "complaint",
    "差", "很差", "差劲", "糟糕", "烂", "失望", "不满意", "再也不", "退款", "投诉",
    "malo", "mala", "terrible", "horrible", "pesimo", "pésimo", "decepcionado", "nunca mas", "nunca más", "reembolso", "queja",
    "mauvais", "mauvaise", "horrible", "déçu", "decu", "jamais", "remboursement", "plainte",
    "schlecht", "schrecklich", "enttäuscht", "enttaeuscht", "nie wieder", "rückerstattung", "rueckerstattung",
    "最悪", "ひどい", "悪い", "二度と", "返金", "苦情",
    "최악", "나쁘", "실망", "다시는", "환불", "불만",
  ];
  const positiveWords = [
    "great", "amazing", "love", "loved", "friendly", "kind", "happy", "perfect", "excellent", "recommend",
    "很好", "很棒", "满意", "喜欢", "推荐", "专业", "友好",
    "bueno", "excelente", "amable", "recomiendo", "perfecto",
    "bon", "excellent", "gentil", "recommande", "parfait",
    "gut", "freundlich", "perfekt", "empfehlen",
    "良い", "最高", "親切", "おすすめ",
    "좋", "친절", "완벽", "추천",
  ];
  const matched = signals.filter((signal) => includesAny(searchText, signal.keys));
  const hasHighRiskIssue = matched.some((signal) => signal.severity === "high");
  const hasAbusiveLanguage = matched.some((signal) => signal.type === "Abusive or angry feedback");
  const hasNeutralText = matched.some((signal) => ["Suggestion", "Neutral experience", "Uncertain feedback"].includes(signal.type));
  const hasNegatedPositivePhrase = includesAny(searchText, ["not happy", "not professional", "not friendly", "not kind", "不专业", "不友好", "不好"]);
  const hasNegativeText = includesAny(sentimentText, negativeWords) || matched.some((signal) => signal.severity === "high" || (signal.severity === "medium" && signal.type !== "Pet comfort"));
  const hasPositiveText = includesAny(positiveText, positiveWords) || (matched.some((signal) => signal.type === "Positive service") && !hasNegatedPositivePhrase);
  const primary = matched.find((signal) => signal.severity === "high")
    || matched.find((signal) => signal.severity === "medium")
    || matched.find((signal) => ["Suggestion", "Neutral experience", "Uncertain feedback"].includes(signal.type))
    || matched[0]
    || { type: "General feedback", severity: "low", detail: "the details of your visit" };

  let sentiment = "positive";
  if (hasHighRiskIssue || hasAbusiveLanguage || rating <= 2 || (hasNegativeText && !hasPositiveText)) {
    sentiment = "negative";
  } else if (rating === 3 || hasNegativeText) {
    sentiment = "mixed";
  } else if (hasNeutralText || (!hasPositiveText && rating === 4)) {
    sentiment = "neutral";
  }

  return {
    sentiment,
    issueType: primary.type,
    severity: primary.severity,
    detail: primary.detail,
    language: detectReviewLanguage(review || ""),
    recommendedAction: reviewRecommendedAction({ sentiment, issueType: primary.type }),
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

  if (insight.sentiment === "neutral") {
    if (short) {
      return `Thank you for sharing this. We appreciate the note about ${insight.detail} and appreciate you choosing ${business}.`;
    }
    return `Thank you for sharing this with us. We appreciate the note about ${insight.detail}; it helps ${business} understand the visit from your point of view. We are glad we had the chance to help and hope the next visit feels even smoother.`;
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
          "First classify the review sentiment from the review text and rating: positive, neutral, mixed, or negative.",
          "The customer review may be written in English, Chinese, Spanish, French, German, Japanese, Korean, or another language.",
          "Always write the final business reply in English, even when the review is not English.",
          "If the review contains complaints, safety concerns, pet discomfort, rude service, price concerns, or scheduling issues, acknowledge that specific issue and do not use a generic positive reply even if the rating is high.",
          "If the review is neutral, factual, uncertain, or lightly suggestive, respond with calm appreciation and relationship-building rather than exaggerated praise.",
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
Detected language: ${insight.language}
Recommended action: ${insight.recommendedAction}
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
