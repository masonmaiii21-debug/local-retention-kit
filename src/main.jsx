import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  AlertCircle,
  Calculator,
  Check,
  Copy,
  Download,
  FileUp,
  Gift,
  Mail,
  MessageSquareText,
  PackageCheck,
  Plus,
  RefreshCcw,
  Send,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import "./styles.css";
import { hasSupabaseConfig, supabase } from "./supabaseClient";

const niches = {
  pet: {
    label: "Pet grooming",
    business: "Happy Paws Grooming",
    buyer: "Pet service owner",
    service: "full groom appointment",
    objection: "price",
    channels: ["SMS", "Email", "Instagram DM"],
    pain: "Most shops lose repeat bookings because reminders, review replies, inquiry follow-ups, and first-visit offers are handled manually.",
    promise: "A ready-to-use follow-up, review-response, and new-client offer kit for your pet service business.",
  },
};

const leadStages = ["New inquiry", "Quoted", "No reply", "Booked", "Due to rebook"];
const tones = ["Professional", "Warm", "Short", "Recovery"];
const newCustomerOffers = [
  "First-visit bonus",
  "Add-on upgrade",
  "Friend referral",
  "Second-visit credit",
];
const aiEndpoint = import.meta.env.VITE_AI_ENDPOINT || "";
const visibleNicheKeys = ["pet"];
const stageLabels = {
  "\u65b0\u54a8\u8be2": "New inquiry",
  "\u5df2\u62a5\u4ef7": "Quoted",
  "\u672a\u56de\u590d": "No reply",
  "\u5df2\u9884\u7ea6": "Booked",
  "\u9700\u590d\u8d2d": "Due to rebook",
};
const sampleOrdersCsv = `customer_name,email,phone,order_date,amount,service
Mia Chen,mia@example.com,555-0101,2026-04-24,85,dog bath + trim
Lucas Brown,lucas@example.com,555-0102,2026-04-21,140,two-dog grooming
Emma Davis,emma@example.com,555-0103,2026-03-17,75,monthly grooming
Mia Chen,mia@example.com,555-0101,2026-03-20,80,dog bath
Noah Wilson,noah@example.com,555-0104,2026-02-22,95,nail trim + bath`;
const sampleLeads = [
  { id: "lead-1", name: "Mia Chen", stage: "Quoted", value: 85, days: 2, need: "dog bath + trim" },
  { id: "lead-2", name: "Lucas Brown", stage: "No reply", value: 140, days: 5, need: "two-dog grooming" },
  { id: "lead-3", name: "Emma Davis", stage: "Due to rebook", value: 75, days: 34, need: "monthly grooming" },
];
const servicePackages = {
  Starter: {
    price: 99,
    promise: "First draft delivered within 24 hours after payment",
    deliverables: ["20 review reply templates", "20 rebooking reminders", "10 inquiry follow-ups", "5 new-client offer ideas", "Simple customer follow-up tracker"],
  },
  Setup: {
    price: 199,
    promise: "Customized copy pack and setup notes within 48 hours",
    deliverables: ["Everything in Starter", "Messages adapted to your shop's tone", "New-client offer rules", "30-minute setup walkthrough", "One 7-day follow-up review"],
  },
  "Done-for-you": {
    price: 299,
    promise: "First real-customer follow-up batch prepared within 72 hours",
    deliverables: ["Everything in Setup", "Import up to 50 customers", "First batch of real follow-up messages", "First new-client promo draft", "Two weeks of usage guidance"],
  },
};

function buildFollowUp({ businessName, leadName, stage, days, channel, service, objection, tone }) {
  const business = businessName.trim() || "Your business";
  const softer = tone === "Warm" ? "Hope you and your family are doing well." : "Quick follow-up.";
  const urgency = days > 3 ? "I wanted to make sure this did not get buried." : "I wanted to check in while the details are still fresh.";
  const objectionLine = {
    price: "If budget is the main concern, I can suggest the best-value option before you book.",
    trust: "If you have any questions about the process or results, I can answer them before you decide.",
    schedule: "If timing is the issue, send me two windows that work and I will help match availability.",
  }[objection];

  if (channel === "SMS") {
    return `Hi ${leadName}, ${business} here. ${urgency} Are you still interested in the ${service}? ${objectionLine} Reply with a good time and I can help.`;
  }

  if (channel === "Instagram DM" || channel === "Facebook DM" || channel === "WhatsApp") {
    return `Hi ${leadName}, ${softer} I am following up on your ${service} request. ${objectionLine} Want me to send the next available options?`;
  }

  return `Subject: Following up on your ${service}

Hi ${leadName},

${softer} ${urgency}

You asked about a ${service}, and I wanted to see if you would still like help booking it. ${objectionLine}

If you want, reply with a time that works this week and I will send the easiest next step.

Best,
${business}`;
}

function buildReviewReply({ businessName, rating, review, tone }) {
  const business = businessName.trim() || "Your business";
  const insight = analyzeReview({ rating, review });
  const short = tone === "Short";

  if (insight.sentiment === "negative") {
    if (short) {
      return `Thank you for telling us. I am sorry the visit with ${business} fell short, especially around ${insight.detail}. Please contact us directly so we can understand what happened and make the next step right.`;
    }

    return `Thank you for being honest about your experience. I am sorry the visit with ${business} did not meet the standard we aim for, especially around ${insight.detail}. Please contact us directly so we can understand what happened, review it with the team, and make the next step right.`;
  }

  if (insight.sentiment === "mixed") {
    return `Thank you for taking the time to share this. I appreciate you mentioning ${insight.detail}; it helps ${business} understand what went well and what we should tighten up. We will review this with the team and keep improving.`;
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

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function detectReviewLanguage(review) {
  if (/[\u4e00-\u9fff]/.test(review)) return "Chinese";
  if (/[\u3040-\u30ff]/.test(review)) return "Japanese";
  if (/[\uac00-\ud7af]/.test(review)) return "Korean";
  if (/[áéíóúñ¿¡]/i.test(review)) return "Spanish";
  if (/[àâçéèêëîïôûùüÿœ]/i.test(review)) return "French";
  if (/[äöüß]/i.test(review)) return "German";
  return "English or unknown";
}

function reviewRecommendedAction({ sentiment, issueType }) {
  if (issueType === "Pet care concern") return "Escalate privately before replying";
  if (issueType === "Abusive or angry feedback") return "Acknowledge frustration calmly";
  if (sentiment === "negative") return "Apologize and invite direct contact";
  if (sentiment === "mixed") return "Acknowledge both sides and improve";
  if (sentiment === "neutral") return "Thank them without overpraising";
  return "Thank them and reinforce the good experience";
}

function analyzeReview({ rating, review }) {
  const lower = String(review || "").toLowerCase();
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

function buildRebook({ businessName, leadName, service, tone }) {
  const business = businessName.trim() || "Your business";
  const warm = tone === "Warm" ? "We loved having you in last time." : "It may be time to book again.";
  return `Hi ${leadName}, ${business} here. ${warm} Would you like me to reserve a spot for your next ${service}? I can send two available times.`;
}

function buildNewCustomerOffer({ businessName, service, offerType, offerValue, offerDeadline, tone }) {
  const business = businessName.trim() || "Your business";
  const targetService = service.trim() || "first appointment";
  const value = offerValue.trim() || "$10";
  const deadline = offerDeadline.trim() || "this month";
  const warm = tone === "Warm";

  const offers = {
    "First-visit bonus": {
      name: `${value} New Client Welcome Credit`,
      promise: `${value} off a first ${targetService}`,
      benefit: "Easy to understand and simple for a first-time customer to redeem.",
      rule: `Valid for first-time clients who book a ${targetService} by ${deadline}. Cannot be combined with other offers.`,
      copy: `${warm ? "New here?" : "First-time client offer:"} Book your first ${targetService} with ${business} by ${deadline} and receive ${value} off your visit. Send us a message with "NEW CLIENT" and we will help you find an easy appointment time.`,
    },
    "Add-on upgrade": {
      name: `Free First-Visit Add-On`,
      promise: `A complimentary small add-on with a first ${targetService}`,
      benefit: "Protects price perception because the customer receives extra value instead of a heavy discount.",
      rule: `Valid for new clients booking a full-price ${targetService} by ${deadline}. Add-on depends on service availability.`,
      copy: `${warm ? "We would love to welcome you in." : "New client bonus:"} First-time clients who book a ${targetService} by ${deadline} receive a complimentary small add-on during the visit. Message ${business} to reserve a spot.`,
    },
    "Friend referral": {
      name: `Bring-a-Friend Welcome Perk`,
      promise: `${value} credit for a new client and the friend who referred them`,
      benefit: "Turns existing happy customers into the acquisition channel.",
      rule: `New client must mention the referring customer when booking by ${deadline}. Credit applies after the first completed visit.`,
      copy: `Know someone who needs a reliable ${targetService}? New clients get ${value} toward their first visit, and the customer who refers them gets the same credit after the visit is completed. Mention this offer when booking with ${business}.`,
    },
    "Second-visit credit": {
      name: `First Visit, Next Visit Reward`,
      promise: `${value} credit toward the second appointment`,
      benefit: "Encourages the first booking while also pulling the customer into a repeat visit.",
      rule: `New client must complete the first ${targetService} by ${deadline}. Credit is applied to the next visit booked within the normal service cycle.`,
      copy: `Book your first ${targetService} with ${business} by ${deadline} and receive a ${value} credit for your next visit. It is a simple way to try us once and make the next appointment easier to schedule.`,
    },
  };

  const selected = offers[offerType] || offers["First-visit bonus"];

  return `Offer: ${selected.name}

Customer benefit:
${selected.promise}

Why it works:
${selected.benefit}

Rules:
${selected.rule}

Ready-to-post copy:
${selected.copy}`;
}

function buildSamplePack({ prospectName, observation, service, tone }) {
  const business = prospectName.trim() || "your shop";
  const detail = observation.trim() || "your reviews and repeat-service flow look like a strong fit";
  const offer = service.trim() || "grooming appointment";
  const warmer = tone === "Warm" ? "Hope you are having a good week." : "Quick idea.";

  return {
    review: `Thanks so much for trusting ${business}. We are glad your visit went smoothly and appreciate you taking the time to leave a review. We hope to see you again for the next ${offer}.`,
    rebook: `Hi, ${business} here. ${warmer} It may be a good time to schedule your next ${offer}. Would you like me to send two easy appointment options for this week or next?`,
    inquiry: `Hi, thanks for reaching out to ${business}. I wanted to follow up in case your ${offer} question got buried. If timing or pricing is the main thing, I can help you pick the easiest next step.`,
    opener: `I noticed ${detail}. I made 3 quick examples below so you can see the tone before committing to anything.`,
  };
}

function numberedLines(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function repeatToCount(items, count) {
  return Array.from({ length: count }, (_, index) => items[index % items.length]);
}

function buildDeliveryPack({ clientBusiness, clientContact, clientEmail, clientPackage, clientGoal, clientTools, clientDeadline, clientVoice, niche }) {
  const selectedPackage = servicePackages[clientPackage] || servicePackages.Starter;
  const business = clientBusiness.trim() || "Client business";
  const contact = clientContact.trim() || "there";
  const email = clientEmail.trim() || "client@example.com";
  const goal = clientGoal.trim() || "increase repeat bookings and follow up with leads faster";
  const tools = clientTools.trim() || "Google reviews, text messages, email, and a customer list";
  const deadline = clientDeadline.trim() || "within 24 hours after payment";
  const voice = clientVoice.trim() || "friendly, clear, and professional";
  const industry = niches[niche]?.label || "local service";
  const deliverables = selectedPackage.deliverables.map((item) => `- ${item}`).join("\n");
  const service = niches[niche]?.service || "service appointment";
  const reviewReplies = repeatToCount([
    `Thank you for choosing ${business}. We are glad the visit went well and appreciate you taking the time to share your experience.`,
    `Thanks so much for the kind review. It means a lot to our team at ${business}, and we look forward to helping again next time.`,
    `We appreciate your feedback and are happy to hear you had a good experience with ${business}. Thank you for supporting a local business.`,
    `Thank you for trusting ${business}. We are glad we could help and hope to see you again soon.`,
    `Thanks for sharing this. We appreciate the specific feedback and will keep working to make every visit feel smooth and easy.`,
  ], 20);
  const rebookingMessages = repeatToCount([
    `Hi, ${business} here. It may be a good time to schedule your next ${service}. Would you like me to send two available options?`,
    `Hi, just checking in from ${business}. We can help reserve your next ${service} if you want to stay on track.`,
    `Quick reminder from ${business}: if you want the same timing as last visit, I can help find an easy appointment this week or next.`,
    `Hi, hope you are doing well. We have a few openings coming up for ${service}. Want me to send the easiest times?`,
    `Hi, ${business} here. If you are ready for the next ${service}, reply with a day that works and I can help book it.`,
  ], 20);
  const leadFollowUps = repeatToCount([
    `Hi, this is ${business}. I wanted to follow up on your ${service} question in case it got buried. Do you still want help choosing the next step?`,
    `Quick follow-up from ${business}. If timing or price is the main question, I can send the simplest option before you decide.`,
    `Hi, I wanted to check whether you still need help with ${service}. I can send two easy options if that helps.`,
    `Thanks again for reaching out to ${business}. Would you like me to hold an appointment option or answer any questions first?`,
    `Hi, I know things get busy. If you are still considering ${service}, reply here and I can make the next step easy.`,
  ], 10);
  const newClientOfferIdeas = [
    `New client welcome: offer a small first-visit credit for customers who book a full ${service} before the end of the month.`,
    `Add-on upgrade: keep the core service full price and include a small complimentary add-on for first-time clients.`,
    `Second-visit reward: give new clients a credit toward their next visit after completing the first appointment.`,
    `Referral welcome: give both the new client and the referring customer a modest credit after the first completed visit.`,
    `Slow-day starter: make the offer valid only on quieter appointment windows to fill unused capacity without discounting peak times.`,
  ];
  const weeklyPlan = [
    "Day 1: Send the best-fit follow-up to open leads that already asked about service.",
    "Day 2: Reply to unanswered positive reviews with the review reply templates.",
    "Day 3: Send rebooking reminders to customers who are due based on the normal service cycle.",
    "Day 4: Test one new-client offer on a slow booking window.",
    "Day 5: Update any messages that sound too formal or too casual for the business.",
    "Day 6: Track replies in the CRM and mark interested customers as booked or needs follow-up.",
    "Day 7: Review what worked, keep the top messages, and prepare the next batch.",
  ];
  const fulfillment = `# ${business} - ${clientPackage} Retention Kit

Prepared for: ${contact}
Email: ${email}
Industry: ${industry}
Tone: ${voice}
Goal: ${goal}
Current tools/data: ${tools}
Delivery timeline: ${deadline}

## How to use this pack

1. Start with customers who already showed intent: recent inquiries, old quotes, and repeat customers.
2. Send only one message per customer first. Keep replies natural and short.
3. Track each reply as booked, not interested, needs later follow-up, or no reply.
4. Reuse the best-performing messages next week.

## Review Reply Templates

${numberedLines(reviewReplies)}

## Rebooking Reminder Messages

${numberedLines(rebookingMessages)}

## Lead Follow-up Messages

${numberedLines(leadFollowUps)}

## New Client Offer Ideas

${numberedLines(newClientOfferIdeas)}

## 7-Day Use Plan

${numberedLines(weeklyPlan)}

## Simple Tracking Columns

Customer name | Last service | Last contact date | Stage | Message used | Reply | Next action | Value`;

  return {
    invoice: `Package: ${clientPackage} - $${selectedPackage.price}
Client: ${business}
Contact: ${contact}
Email: ${email}
Delivery target: ${deadline}

Invoice note:
${clientPackage} retention kit for ${business}. ${selectedPackage.promise}.`,
    confirmation: `Subject: ${business} ${clientPackage} retention kit - next steps

Hi ${contact},

Thanks for moving forward with the ${clientPackage} retention kit for ${business}. Once payment is complete, I will prepare the first draft on this timeline: ${deadline}.

To keep the first version useful, I will focus on this goal:
${goal}

I will use a ${voice} tone and build around your current tools: ${tools}.

Best,
Mason`,
    checklist: `Client intake checklist

Business: ${business}
Industry: ${industry}
Package: ${clientPackage} ($${selectedPackage.price})
Tone: ${voice}
Goal: ${goal}
Current tools/data: ${tools}
Deadline: ${deadline}

Deliverables:
${deliverables}

Before delivery:
- Confirm payment received in PayPal
- Ask for recent reviews or customer examples if missing
- Generate review replies, rebooking reminders, and lead follow-ups
- Export or copy the finished pack into a simple document
- Send the delivery email and mark the lead as Booked or Due to rebook`,
    deliveryEmail: `Subject: First draft for ${business}

Hi ${contact},

Here is the first draft of your ${clientPackage} retention kit.

Included:
${deliverables}

I focused on this goal: ${goal}

Please reply with any tone changes or examples that should sound more like your team. I can revise the first version once and then help you decide where to use each message.

Best,
Mason`,
    fulfillment,
  };
}

async function copyText(text) {
  await navigator.clipboard?.writeText(text);
}

function loadLeads() {
  try {
    const stored = localStorage.getItem("local-retention-kit-leads");
    return stored ? JSON.parse(stored).map(normalizeLead) : sampleLeads;
  } catch {
    return sampleLeads;
  }
}

function normalizeLead(lead) {
  return {
    ...lead,
    stage: stageLabels[lead.stage] || lead.stage || "New inquiry",
  };
}

function toCsvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadLeadsCsv(leads) {
  const header = ["name", "stage", "value", "days_since_contact", "service_need"];
  const rows = leads.map((lead) => [lead.name, lead.stage, lead.value, lead.days, lead.need]);
  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "local-retention-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value) {
  return String(value || "client")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "client";
}

function loadIntakes() {
  try {
    const stored = localStorage.getItem("local-retention-kit-intakes");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickValue(record, candidates) {
  for (const candidate of candidates) {
    const found = record[normalizeHeader(candidate)];
    if (found) return found;
  }
  return "";
}

function daysSince(dateValue) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return 0;
  const diff = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function stageFromOrders(orderCount, days, rebookDays = 28) {
  if (days >= rebookDays * 2) return "No reply";
  if (days >= rebookDays || orderCount >= 2) return "Due to rebook";
  return "Booked";
}

function leadOrderCount(lead) {
  const match = String(lead.need || "").match(/\((\d+)\s+orders?\)/i);
  if (match) return Number(match[1]);
  return lead.stage === "Due to rebook" ? 1 : 0;
}

function leadServiceName(lead) {
  return String(lead.need || "recent service").replace(/\s*\(\d+\s+orders?\)\s*$/i, "").trim() || "recent service";
}

function leadCustomerType(lead) {
  if (lead.stage === "Due to rebook") return "Returning customer";
  if (lead.stage === "No reply") return "Silent prospect";
  if (lead.stage === "Quoted") return "Quoted lead";
  if (lead.stage === "Booked") return "Booked customer";
  return "New inquiry";
}

function leadPriority(lead, rebookDays) {
  if (lead.stage === "No reply" && lead.days >= 14) return "High";
  if (lead.stage === "Due to rebook" && lead.days >= rebookDays + 14) return "High";
  if (lead.stage === "No reply" || lead.stage === "Due to rebook") return "Medium";
  return "Low";
}

function leadNextAction(lead, rebookDays) {
  if (lead.stage === "Due to rebook") {
    return lead.days >= rebookDays + 14
      ? "Send a warm rebooking reminder with two available times."
      : "Send a light reminder that it may be time to book again.";
  }

  if (lead.stage === "No reply") {
    return lead.days >= 14
      ? "Send one short final follow-up and make the next step easy."
      : "Send a soft check-in that removes friction around booking.";
  }

  if (lead.stage === "Quoted") {
    return "Follow up on the quote and offer the simplest booking option.";
  }

  return "Keep this customer in the tracker and wait for the next trigger.";
}

function ordersToLeads(csvText, rebookDays = 28) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const grouped = new Map();

  rows.slice(1).forEach((cells, index) => {
    const record = {};
    headers.forEach((header, headerIndex) => {
      record[header] = cells[headerIndex] || "";
    });

    const name = pickValue(record, ["customer_name", "customer", "client", "name", "buyer_name", "billing_name"]) || `Customer ${index + 1}`;
    const email = pickValue(record, ["email", "customer_email", "contact_email"]);
    const phone = pickValue(record, ["phone", "customer_phone", "telephone", "mobile"]);
    const orderDate = pickValue(record, ["order_date", "date", "created_at", "created", "appointment_date", "booking_date"]);
    const amount = Number(String(pickValue(record, ["amount", "total", "price", "order_total", "paid", "subtotal"])).replace(/[^0-9.-]/g, "")) || 0;
    const service = pickValue(record, ["service", "item", "product", "line_item", "appointment_type", "description"]) || "recent service";
    const key = email || phone || name.toLowerCase();

    const previous = grouped.get(key) || {
      id: `import-${Date.now()}-${index}`,
      name,
      email,
      phone,
      value: 0,
      days: 0,
      need: service,
      orderCount: 0,
      latestDate: "",
    };

    const currentDate = new Date(orderDate);
    const previousDate = new Date(previous.latestDate);
    const isLatest = orderDate && (!previous.latestDate || currentDate > previousDate);

    grouped.set(key, {
      ...previous,
      value: Number((previous.value + amount).toFixed(2)),
      need: isLatest ? service : previous.need,
      latestDate: isLatest ? orderDate : previous.latestDate,
      days: isLatest ? daysSince(orderDate) : previous.days,
      orderCount: previous.orderCount + 1,
    });
  });

  return Array.from(grouped.values()).map((lead) => ({
    id: lead.id,
    name: lead.name,
    stage: stageFromOrders(lead.orderCount, lead.days, rebookDays),
    value: lead.value,
    days: lead.days,
    need: `${lead.need} (${lead.orderCount} orders)`,
  }));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function dbToLead(row) {
  return {
    id: row.id,
    name: row.name,
    stage: stageLabels[row.stage] || row.stage,
    value: Number(row.value || 0),
    days: Number(row.days_since_contact || 0),
    need: row.service_need || "",
  };
}

function leadToDb(lead, userId) {
  return {
    user_id: userId,
    name: lead.name,
    stage: lead.stage,
    value: Number(lead.value || 0),
    days_since_contact: Number(lead.days || 0),
    service_need: lead.need || "",
  };
}

function App() {
  const [leads, setLeads] = useState(loadLeads);
  const [intakes, setIntakes] = useState(loadIntakes);
  const [selectedLeadId, setSelectedLeadId] = useState("lead-1");
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiReviewReply, setAiReviewReply] = useState("");
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [niche, setNiche] = useState("pet");
  const [businessName, setBusinessName] = useState(niches.pet.business);
  const [rebookDays, setRebookDays] = useState(28);
  const [leadName, setLeadName] = useState("Mia");
  const [stage, setStage] = useState("Quoted");
  const [days, setDays] = useState(3);
  const [channel, setChannel] = useState("SMS");
  const [service, setService] = useState(niches.pet.service);
  const [objection, setObjection] = useState("price");
  const [tone, setTone] = useState("Warm");
  const [offerType, setOfferType] = useState("First-visit bonus");
  const [offerValue, setOfferValue] = useState("$10");
  const [offerDeadline, setOfferDeadline] = useState("this month");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("The team was friendly and my dog looked great.");
  const [prospectName, setProspectName] = useState("Austin Pet Stylist");
  const [prospectObservation, setProspectObservation] = useState("appointment-based small dog grooming with a personal owner-led tone");
  const [sampleService, setSampleService] = useState("small dog grooming appointment");
  const [clientBusiness, setClientBusiness] = useState("Austin Pet Stylist");
  const [clientContact, setClientContact] = useState("Owner");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPackage, setClientPackage] = useState("Starter");
  const [clientGoal, setClientGoal] = useState("get more repeat grooming bookings from past customers");
  const [clientTools, setClientTools] = useState("Google reviews, Instagram DMs, appointment list");
  const [clientDeadline, setClientDeadline] = useState("within 24 hours after payment");
  const [clientVoice, setClientVoice] = useState("friendly, calm, and concise");
  const [missedRebookings, setMissedRebookings] = useState(8);
  const [averageTicket, setAverageTicket] = useState(85);
  const [recoveryRate, setRecoveryRate] = useState(25);

  const active = niches[niche];
  const followUp = useMemo(
    () => buildFollowUp({ businessName, leadName, stage, days, channel, service, objection, tone }),
    [businessName, leadName, stage, days, channel, service, objection, tone]
  );
  const reviewReply = useMemo(
    () => buildReviewReply({ businessName, rating, review, tone }),
    [businessName, rating, review, tone]
  );
  const reviewInsight = useMemo(
    () => analyzeReview({ rating, review }),
    [rating, review]
  );
  const finalReviewReply = aiReviewReply || reviewReply;
  const rebook = useMemo(
    () => buildRebook({ businessName, leadName, service, tone }),
    [businessName, leadName, service, tone]
  );
  const newCustomerOffer = useMemo(
    () => buildNewCustomerOffer({ businessName, service, offerType, offerValue, offerDeadline, tone }),
    [businessName, service, offerType, offerValue, offerDeadline, tone]
  );
  const samplePack = useMemo(
    () => buildSamplePack({ prospectName, observation: prospectObservation, service: sampleService, tone }),
    [prospectName, prospectObservation, sampleService, tone]
  );
  const deliveryPack = useMemo(
    () => buildDeliveryPack({
      clientBusiness,
      clientContact,
      clientEmail,
      clientPackage,
      clientGoal,
      clientTools,
      clientDeadline,
      clientVoice,
      niche,
    }),
    [clientBusiness, clientContact, clientEmail, clientPackage, clientGoal, clientTools, clientDeadline, clientVoice, niche]
  );

  useEffect(() => {
    localStorage.setItem("local-retention-kit-leads", JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem("local-retention-kit-intakes", JSON.stringify(intakes));
  }, [intakes]);

  useEffect(() => {
    setAiReviewReply("");
    setAiStatus("");
  }, [businessName, rating, review, tone, niche]);

  useEffect(() => {
    if (!hasSupabaseConfig) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || !session?.user) return;
    loadCloudLeads();
  }, [session?.user?.id]);

  useEffect(() => {
    const shotTarget = new URLSearchParams(window.location.search).get("shot");
    if (!shotTarget) return;
    document.body.dataset.shot = shotTarget;
    window.setTimeout(() => {
      document.getElementById(shotTarget)?.scrollIntoView({ block: "start" });
    }, 250);
    return () => {
      delete document.body.dataset.shot;
    };
  }, []);

  function switchNiche(next) {
    setNiche(next);
    setBusinessName(niches[next].business);
    setService(niches[next].service);
    setChannel(niches[next].channels[0]);
    setObjection(niches[next].objection);
  }

  async function loadCloudLeads() {
    setSyncStatus("Loading saved customers...");
    const { data, error } = await supabase
      .from("leads")
      .select("id,name,stage,value,days_since_contact,service_need")
      .order("created_at", { ascending: true });

    if (error) {
      setSyncStatus(`Cloud sync failed: ${error.message}`);
      return;
    }

    const cloudLeads = data.map(dbToLead);
    setLeads(cloudLeads.length > 0 ? cloudLeads : sampleLeads);
    setSelectedLeadId(cloudLeads[0]?.id || sampleLeads[0].id);
    setSyncStatus(cloudLeads.length > 0 ? "Saved customers loaded." : "No saved customers yet. Showing sample data.");
  }

  async function signInWithEmail() {
    if (!authEmail.trim()) {
      setSyncStatus("Enter an email address.");
      return;
    }

    setSyncStatus("Sending login link...");
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo: window.location.href.split("#")[0].split("?")[0],
      },
    });

    setSyncStatus(error ? `Login link failed: ${error.message}` : "Login link sent. Check your email.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setSyncStatus("Signed out. This browser is using local data.");
  }

  function applyLead(lead) {
    setSelectedLeadId(lead.id);
    setLeadName(lead.name.split(" ")[0] || lead.name);
    setStage(lead.stage);
    setDays(lead.days);
    setService(lead.need);
  }

  async function persistLead(lead) {
    if (!hasSupabaseConfig || !session?.user) return lead;

    const payload = leadToDb(lead, session.user.id);
    const query = isUuid(lead.id)
      ? supabase.from("leads").update(payload).eq("id", lead.id).select().single()
      : supabase.from("leads").insert(payload).select().single();

    const { data, error } = await query;
    if (error) {
      setSyncStatus(`Save failed: ${error.message}`);
      return lead;
    }

    setSyncStatus("Saved to cloud.");
    return dbToLead(data);
  }

  async function saveCurrentLead() {
    const nextLead = {
      id: selectedLeadId || `lead-${Date.now()}`,
      name: leadName.trim() || "New customer",
      stage,
      value: Number(leads.find((lead) => lead.id === selectedLeadId)?.value || 99),
      days: Number(days),
      need: service.trim() || active.service,
    };

    const savedLead = await persistLead(nextLead);
    setLeads((current) => {
      const exists = current.some((lead) => lead.id === nextLead.id || lead.id === savedLead.id);
      return exists
        ? current.map((lead) => lead.id === nextLead.id || lead.id === savedLead.id ? savedLead : lead)
        : [savedLead, ...current];
    });
    setSelectedLeadId(savedLead.id);
  }

  async function createLead() {
    const nextLead = {
      id: `lead-${Date.now()}`,
      name: "New Lead",
      stage: "New inquiry",
      value: 99,
      days: 0,
      need: active.service,
    };
    const savedLead = await persistLead(nextLead);
    setLeads((current) => [savedLead, ...current]);
    applyLead(savedLead);
  }

  function updateLead(id, patch) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...patch } : lead));
  }

  async function deleteLead(id) {
    if (hasSupabaseConfig && session?.user && isUuid(id)) {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      setSyncStatus(error ? `Delete failed: ${error.message}` : "Deleted from cloud.");
      if (error) return;
    }

    setLeads((current) => current.filter((lead) => lead.id !== id));
    if (selectedLeadId === id) {
      const fallback = leads.find((lead) => lead.id !== id);
      if (fallback) applyLead(fallback);
    }
  }

  async function importOrdersCsvText(csvText) {
    const imported = ordersToLeads(csvText, Number(rebookDays) || 28);
    if (imported.length === 0) {
      setImportStatus("No orders found. Make sure the CSV has headers and at least one order row.");
      return;
    }

    setLeads((current) => {
      const existing = new Map(current.map((lead) => [lead.name.toLowerCase(), lead]));
      imported.forEach((lead) => existing.set(lead.name.toLowerCase(), lead));
      return Array.from(existing.values());
    });
    applyLead(imported[0]);
    setImportStatus(`Imported ${imported.length} customers and marked likely follow-up stages.`);
  }

  async function generateAiReviewReply() {
    if (!aiEndpoint) {
      setAiStatus("Smart generation is not connected yet. The built-in template is still ready to use.");
      setAiReviewReply("");
      return;
    }

    if (!review.trim()) {
      setAiStatus("Paste a real review first, then generate a reply.");
      return;
    }

    setIsGeneratingReview(true);
    setAiStatus("Generating a more natural review reply...");

    try {
      const response = await fetch(aiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "review_reply",
          businessName,
          niche: active.label,
          rating,
          review,
          tone,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const generatedText = data.source === "fallback" ? reviewReply : String(data.text || "").trim();
      setAiReviewReply(generatedText);
      setAiStatus(
        data.source === "fallback"
          ? "Custom reply generated using backup mode."
          : "Review reply generated. Edit the review and generate again if needed."
      );
    } catch (error) {
      setAiReviewReply("");
      setAiStatus(`Smart generation is unavailable. The template reply is still available: ${error.message}`);
    } finally {
      setIsGeneratingReview(false);
    }
  }

  function saveClientIntake() {
    const selectedPackage = servicePackages[clientPackage] || servicePackages.Starter;
    const intake = {
      id: `intake-${Date.now()}`,
      business: clientBusiness.trim() || "New client",
      contact: clientContact.trim() || "Owner",
      email: clientEmail.trim(),
      packageName: clientPackage,
      value: selectedPackage.price,
      goal: clientGoal.trim(),
      deadline: clientDeadline.trim(),
      createdAt: new Date().toISOString(),
    };

    setIntakes((current) => [intake, ...current].slice(0, 8));
    const lead = {
      id: `lead-${Date.now()}`,
      name: intake.business,
      stage: "Quoted",
      value: intake.value,
      days: 0,
      need: `${intake.packageName} retention kit - ${intake.goal || active.service}`,
    };
    setLeads((current) => [lead, ...current]);
    applyLead(lead);
    setDeliveryStatus(`${intake.business} was added to the setup queue and follow-up tracker.`);
  }

  function downloadCurrentDeliveryPack() {
    const content = [
      deliveryPack.invoice,
      "\n---\n",
      deliveryPack.confirmation,
      "\n---\n",
      deliveryPack.checklist,
      "\n---\n",
      deliveryPack.deliveryEmail,
      "\n---\n",
      deliveryPack.fulfillment,
    ].join("\n");
    downloadTextFile(`${sanitizeFileName(clientBusiness)}-${clientPackage.toLowerCase()}-delivery-pack.txt`, content);
    setDeliveryStatus("Delivery pack downloaded.");
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importOrdersCsvText(text);
    event.target.value = "";
  }

  const dueLeads = leads.filter((lead) => lead.stage === "No reply" || lead.stage === "Quoted" || lead.stage === "Due to rebook");
  const totalPipelineValue = leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const activePackage = servicePackages[clientPackage] || servicePackages.Starter;
  const monthlyRecovered = Math.round(Number(missedRebookings || 0) * Number(averageTicket || 0) * (Number(recoveryRate || 0) / 100));
  const annualRecovered = monthlyRecovered * 12;
  const sampleLandingPacks = [
    {
      name: "Austin Pet Stylist",
      fit: "solo grooming studio with maintenance bath appointments",
      review: "Thank you for trusting Austin Pet Stylist. We are glad your pup looked and felt great after the visit, and we appreciate you taking the time to share it.",
      rebook: "Hi, Austin Pet Stylist here. If your pup is ready for a maintenance bath between haircuts, I can send a couple of easy appointment options for this week or next.",
      inquiry: "Hi, just checking in from Austin Pet Stylist. If you still need help choosing the right grooming option, reply here and I can make the next step simple.",
    },
    {
      name: "BarkSuds Austin",
      fit: "appointment-focused grooming salon with repeat visit potential",
      review: "Thanks for choosing BarkSuds Austin. We are happy the grooming visit went smoothly and appreciate you sharing your experience with other local pet owners.",
      rebook: "Hi, BarkSuds Austin here. It may be a good time to reserve your next grooming visit. Want me to send two appointment options that are easy to book?",
      inquiry: "Hi, thanks again for checking out BarkSuds Austin. If you were looking at appointments and got busy, I can help you pick the easiest time to come in.",
    },
    {
      name: "Soco Pet Lounge",
      fit: "daycare, boarding, and grooming with multiple repeat-service moments",
      review: "Thank you for visiting Soco Pet Lounge. We appreciate you trusting us with your pet and are glad the experience was smooth from drop-off to pickup.",
      rebook: "Hi, Soco Pet Lounge here. If you need grooming, daycare, or boarding again soon, I can send the easiest available options for your schedule.",
      inquiry: "Hi, just following up from Soco Pet Lounge. If you still have questions about grooming, daycare, or boarding, reply here and we can help with the next step.",
    },
  ];

  return (
    <main>
      <section className="hero">
        <nav className="topbar">
          <div className="brand">
            <span className="brand-mark"><Sparkles size={18} /></span>
            <span>Local Retention Kit</span>
          </div>
          <a className="nav-action" href="#generator">
            <Send size={16} />
            Create messages
          </a>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">For pet grooming and local pet service teams</p>
            <h1>Turn happy pet clients into repeat bookings.</h1>
            <p>
              Ready-to-send review replies, rebooking reminders, and inquiry follow-ups for pet grooming and local pet service teams.
              Keep customers coming back without adding another complicated app.
            </p>
            <div className="hero-actions">
              <a className="primary" href="#generator">
                Try the message builder <ArrowRight size={18} />
              </a>
              <a className="secondary" href="#offer">
                View pricing
              </a>
              <a className="secondary" href="#client-demo">
                See how it works
              </a>
              <a className="secondary" href="#free-sample">
                Free samples
              </a>
              <a className="secondary" href="#intake">
                Start setup
              </a>
            </div>
          </div>

          <div className="signal-panel" aria-label="project signal">
            <div className="panel-header">
              <span>Built for</span>
              <strong>{active.label}</strong>
            </div>
            <p>{active.pain}</p>
            <div className="metric-row">
              <div>
                <strong>$99-$299</strong>
                <span>Setup packages</span>
              </div>
              <div>
                <strong>7-day</strong>
                <span>Starter use plan</span>
              </div>
              <div>
                <strong>Simple</strong>
                <span>Simple launch path</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="client-demo" id="client-demo">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">How it helps</p>
            <h2>A simple follow-up system for repeat pet service customers.</h2>
          </div>
          <p className="section-note">
            Keep the workflow familiar: copy a message, send it through your current channel, and track the next step.
          </p>
        </div>

        <div className="client-demo-grid">
          <article className="client-pitch">
            <p className="eyebrow">For local pet service businesses</p>
            <h3>Bring more past customers back without adding another complicated app.</h3>
            <p>
              Local Retention Kit gives your team ready-to-send review replies, rebooking reminders,
              and follow-up messages for customers who asked about service but never booked.
            </p>
            <div className="pitch-points">
              <span><Check size={16} /> Ready-to-copy messages</span>
              <span><Check size={16} /> Simple customer follow-up tracker</span>
              <span><Check size={16} /> Works with your existing email, text, or DM workflow</span>
            </div>
            <div className="client-actions">
              <a className="primary" href="#free-sample">See free samples</a>
              <a className="secondary dark" href="#intake">Start a setup</a>
            </div>
          </article>

          <aside className="roi-panel">
            <div className="roi-header">
              <span><Calculator size={18} /></span>
              <div>
                <p className="eyebrow">Simple ROI estimate</p>
                <h3>What could better follow-up recover?</h3>
              </div>
            </div>
            <div className="roi-inputs">
              <label>
                Missed rebookings per month
                <input
                  type="number"
                  min="0"
                  value={missedRebookings}
                  onChange={(event) => setMissedRebookings(Number(event.target.value))}
                />
              </label>
              <label>
                Average ticket
                <input
                  type="number"
                  min="0"
                  value={averageTicket}
                  onChange={(event) => setAverageTicket(Number(event.target.value))}
                />
              </label>
              <label>
                Recovery rate %
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={recoveryRate}
                  onChange={(event) => setRecoveryRate(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="roi-result">
              <span>Estimated recovered revenue</span>
              <strong>${monthlyRecovered}/mo</strong>
              <small>${annualRecovered}/yr if the same pattern holds</small>
            </div>
          </aside>
        </div>
      </section>

      <section className="free-sample-landing" id="free-sample">
        <div className="free-sample-hero">
          <div>
            <p className="eyebrow">Free Custom Sample</p>
            <h2>Get 3 ready-to-send customer messages for your pet business.</h2>
            <p>
              I will make one review reply, one rebooking reminder, and one follow-up message based on your shop's services and tone.
              No new software required. You can use the messages in email, text, Instagram, or your booking workflow.
            </p>
          </div>
          <div className="sample-offer-box">
            <span>What you receive</span>
            <strong>3 custom examples</strong>
            <small>Usually delivered as a quick reply before any paid setup.</small>
            <a className="primary" href="#sample-pack">Build a sample now</a>
          </div>
        </div>

        <div className="sample-preview-grid">
          {sampleLandingPacks.map((pack) => (
            <article className="sample-preview-card" key={pack.name}>
              <div>
                <span>{pack.name}</span>
                <p>{pack.fit}</p>
              </div>
              <ul>
                <li><strong>Review reply</strong>{pack.review}</li>
                <li><strong>Rebooking reminder</strong>{pack.rebook}</li>
                <li><strong>Lead follow-up</strong>{pack.inquiry}</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace" id="generator">
        <aside className="sidebar">
          <h2>Service focus</h2>
          <div className="niche-list">
            {visibleNicheKeys.map((key) => {
              const item = niches[key];
              return (
                <button
                  className={key === niche ? "selected" : ""}
                  key={key}
                  onClick={() => switchNiche(key)}
                >
                  <span>{item.label}</span>
                  <small>{item.buyer}</small>
                </button>
              );
            })}
          </div>

          <div className="offer-box">
            <span>What this does</span>
            <p>{active.promise}</p>
          </div>

          <div className="settings-box">
            <span>Shop settings</span>
            <label>
              Business name
              <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
            </label>
            <label>
              Rebooking cycle
              <input
                type="number"
                min="1"
                value={rebookDays}
                onChange={(event) => setRebookDays(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="cloud-box">
            <span>Data save</span>
            {!hasSupabaseConfig && (
              <p>This demo saves in your browser. Cloud save is available when connected.</p>
            )}
            {hasSupabaseConfig && session?.user && (
              <>
                <p>Cloud save is active: {session.user.email}</p>
                <button onClick={signOut}>Sign out</button>
              </>
            )}
            {hasSupabaseConfig && !session?.user && (
              <>
                <p>Enter your email to receive a login link and save customers.</p>
                <input
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
                <button onClick={signInWithEmail}>Send login link</button>
              </>
            )}
            {syncStatus && <small>{syncStatus}</small>}
          </div>
        </aside>

        <section className="tool-surface">
          <div className="toolbar">
            <div>
              <p className="eyebrow">Message Builder</p>
              <h2>Create follow-up messages for pet customers</h2>
            </div>
            <button className="icon-button" title="Reset sample" onClick={() => {
              setLeadName("Mia");
              setStage("Quoted");
              setDays(3);
              setReview("The team was friendly and my dog looked great.");
              setAiReviewReply("");
              setAiStatus("");
            }}>
              <RefreshCcw size={18} />
            </button>
          </div>

          <div className="form-grid">
            <label>
              Customer name
              <input value={leadName} onChange={(event) => setLeadName(event.target.value)} />
            </label>
            <label>
              Follow-up stage
              <select value={stage} onChange={(event) => setStage(event.target.value)}>
                {leadStages.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Days since contact
              <input type="number" min="0" value={days} onChange={(event) => setDays(Number(event.target.value))} />
            </label>
            <label>
              Channel
              <select value={channel} onChange={(event) => setChannel(event.target.value)}>
                {active.channels.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Service
              <input value={service} onChange={(event) => setService(event.target.value)} />
            </label>
            <label>
              Main concern
              <select value={objection} onChange={(event) => setObjection(event.target.value)}>
                <option value="price">Price</option>
                <option value="trust">Trust</option>
                <option value="schedule">Schedule</option>
              </select>
            </label>
          </div>

          <div className="tone-row">
            {tones.map((item) => (
              <button className={tone === item ? "active" : ""} key={item} onClick={() => setTone(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="output-grid">
            <OutputCard icon={<MessageSquareText size={18} />} title="Inquiry follow-up" text={followUp} />
            <OutputCard icon={<RefreshCcw size={18} />} title="Rebooking reminder" text={rebook} />
          </div>
        </section>

        <section className="tool-surface offer-tool">
          <div className="toolbar">
            <div>
              <p className="eyebrow">New Customer Offer</p>
              <h2>Create a first-visit benefit</h2>
            </div>
            <Gift size={22} />
          </div>
          <div className="form-grid compact">
            <label>
              Offer type
              <select value={offerType} onChange={(event) => setOfferType(event.target.value)}>
                {newCustomerOffers.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Benefit value
              <input value={offerValue} onChange={(event) => setOfferValue(event.target.value)} />
            </label>
            <label>
              Booking deadline
              <input value={offerDeadline} onChange={(event) => setOfferDeadline(event.target.value)} />
            </label>
            <label>
              Service
              <input value={service} onChange={(event) => setService(event.target.value)} />
            </label>
          </div>
          <div className="offer-tips">
            <span>Good first offers protect margin, feel specific, and give the customer a clear booking step.</span>
          </div>
          <OutputCard icon={<Gift size={18} />} title="New customer offer" text={newCustomerOffer} />
        </section>

        <section className="tool-surface review-tool">
          <div className="toolbar">
            <div>
              <p className="eyebrow">Review Assist</p>
              <h2>Review reply builder</h2>
            </div>
            <Star size={22} />
          </div>
          <div className="form-grid compact">
            <label>
              Star rating
              <input type="number" min="1" max="5" value={rating} onChange={(event) => setRating(Number(event.target.value))} />
            </label>
            <label className="wide">
              Review text
              <textarea value={review} onChange={(event) => setReview(event.target.value)} />
            </label>
          </div>
          <div className={`review-insight ${reviewInsight.sentiment}`} aria-live="polite">
            <div className="review-insight-main">
              <strong>{reviewInsight.sentiment}</strong>
              <span>{reviewInsight.issueType} · {reviewInsight.severity} priority</span>
            </div>
            <div className="review-insight-meta">
              <span>Language: {reviewInsight.language}</span>
              <span>Action: {reviewInsight.recommendedAction}</span>
            </div>
          </div>
          <div className="ai-actions">
            <button onClick={generateAiReviewReply} disabled={isGeneratingReview}>
              <Sparkles size={16} />
              {isGeneratingReview ? "Generating" : "Create review reply"}
            </button>
            {aiStatus && <span>{aiStatus}</span>}
          </div>
          <OutputCard icon={<Mail size={18} />} title={aiReviewReply ? "Custom business reply" : "Business reply"} text={finalReviewReply} />
        </section>
      </section>

      <section className="sample-section" id="sample-pack">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Free Sample Pack</p>
            <h2>Build 3 free sample messages</h2>
          </div>
          <p className="section-note">
            Enter a business name, service, and one specific observation. The samples are ready to copy into email or DM.
          </p>
        </div>

        <div className="sample-builder">
          <div className="form-grid">
            <label>
              Business name
              <input value={prospectName} onChange={(event) => setProspectName(event.target.value)} />
            </label>
            <label>
              Service
              <input value={sampleService} onChange={(event) => setSampleService(event.target.value)} />
            </label>
            <label>
              Specific observation
              <input value={prospectObservation} onChange={(event) => setProspectObservation(event.target.value)} />
            </label>
          </div>
          <OutputCard icon={<Sparkles size={18} />} title="Opening note" text={samplePack.opener} />
          <div className="output-grid">
            <OutputCard icon={<Star size={18} />} title="Review reply sample" text={samplePack.review} />
            <OutputCard icon={<RefreshCcw size={18} />} title="Rebooking sample" text={samplePack.rebook} />
            <OutputCard icon={<MessageSquareText size={18} />} title="Inquiry follow-up sample" text={samplePack.inquiry} />
          </div>
        </div>
      </section>

      <section className="intake-section" id="intake">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Start Setup</p>
            <h2>Choose a package and prepare your first message pack.</h2>
          </div>
          <p className="section-note">
            Select a package, enter your shop details, and download the setup notes and first delivery draft.
          </p>
        </div>

        <div className="intake-grid">
          <div className="intake-form">
            <div className="package-tabs" aria-label="Package selector">
              {Object.entries(servicePackages).map(([name, item]) => (
                <button
                  className={clientPackage === name ? "active" : ""}
                  key={name}
                  onClick={() => setClientPackage(name)}
                >
                  <strong>{name}</strong>
                  <span>${item.price}</span>
                </button>
              ))}
            </div>

            <div className="form-grid">
              <label>
                Business name
                <input value={clientBusiness} onChange={(event) => setClientBusiness(event.target.value)} />
              </label>
              <label>
                Contact name
                <input value={clientContact} onChange={(event) => setClientContact(event.target.value)} />
              </label>
              <label>
                Email
                <input placeholder="client@example.com" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} />
              </label>
              <label>
                Target delivery time
                <input value={clientDeadline} onChange={(event) => setClientDeadline(event.target.value)} />
              </label>
              <label>
                Brand voice
                <input value={clientVoice} onChange={(event) => setClientVoice(event.target.value)} />
              </label>
              <label>
                Current tools or data
                <input value={clientTools} onChange={(event) => setClientTools(event.target.value)} />
              </label>
              <label className="full-span">
                Main goal
                <textarea value={clientGoal} onChange={(event) => setClientGoal(event.target.value)} />
              </label>
            </div>

            <div className="intake-actions">
              <button onClick={saveClientIntake}>
                <Check size={16} />
                Save setup
              </button>
              <button onClick={downloadCurrentDeliveryPack}>
                <Download size={16} />
                Download message pack
              </button>
            </div>

            {deliveryStatus && (
              <div className="import-status">
                <AlertCircle size={16} />
                <span>{deliveryStatus}</span>
              </div>
            )}
          </div>

          <aside className="intake-summary">
            <div>
              <span>Selected package</span>
              <strong>${activePackage.price}</strong>
              <p>{activePackage.promise}</p>
            </div>
            <ul>
              {activePackage.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="recent-intakes">
              <span>Recent setups</span>
              {intakes.length === 0 && <p>No saved setups yet.</p>}
              {intakes.map((item) => (
                <button key={item.id} onClick={() => {
                  setClientBusiness(item.business);
                  setClientContact(item.contact);
                  setClientEmail(item.email);
                  setClientPackage(item.packageName);
                  setClientGoal(item.goal);
                  setClientDeadline(item.deadline);
                }}>
                  <strong>{item.business}</strong>
                  <span>{item.packageName} · ${item.value}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        <div className="delivery-output-grid">
          <OutputCard icon={<PackageCheck size={18} />} title="Invoice note" text={deliveryPack.invoice} />
          <OutputCard icon={<Mail size={18} />} title="Confirmation email" text={deliveryPack.confirmation} />
          <OutputCard icon={<Check size={18} />} title="Setup checklist" text={deliveryPack.checklist} />
          <OutputCard icon={<Send size={18} />} title="Delivery email" text={deliveryPack.deliveryEmail} />
          <div className="full-output">
            <OutputCard icon={<Sparkles size={18} />} title="Full message pack" text={deliveryPack.fulfillment} />
          </div>
        </div>
      </section>

      <section className="pipeline" id="crm">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Customer Tracker</p>
            <h2>Track who needs a follow-up next.</h2>
          </div>
          <div className="table-actions">
            <button onClick={createLead}>
              <Plus size={16} />
              New customer
            </button>
            <button onClick={saveCurrentLead}>
              <Check size={16} />
              Save current customer
            </button>
            <button onClick={() => downloadLeadsCsv(leads)}>
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="import-panel">
          <div>
            <p className="eyebrow">Order Import</p>
            <h2>Import an order CSV and find customers who may be due to return.</h2>
            <p>
              Works with common exports from Square, Wix, Shopify, Clover, and similar tools. The importer looks for customer names,
              order dates, amounts, and services, then turns them into a simple follow-up list.
            </p>
          </div>
          <div className="import-actions">
            <label className="file-button">
              <FileUp size={16} />
              Import order CSV
              <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} />
            </label>
            <button onClick={() => importOrdersCsvText(sampleOrdersCsv)}>
              Use sample orders
            </button>
          </div>
          {importStatus && (
            <div className="import-status">
              <AlertCircle size={16} />
              <span>{importStatus}</span>
            </div>
          )}
        </div>

        <div className="dashboard-strip">
          <div>
            <strong>{leads.length}</strong>
            <span>Customers</span>
          </div>
          <div>
            <strong>{dueLeads.length}</strong>
            <span>Need follow-up</span>
          </div>
          <div>
            <strong>${totalPipelineValue}</strong>
            <span>Pipeline value</span>
          </div>
        </div>

        <div className="lead-table">
          <div className="lead-row table-head">
            <span>Customer</span>
            <span>Stage</span>
            <span>Value</span>
            <span>Days</span>
            <span>Service</span>
            <span>Action</span>
          </div>
          {leads.map((lead) => (
            <div className="lead-row" key={lead.id}>
              <input value={lead.name} onChange={(event) => updateLead(lead.id, { name: event.target.value })} />
              <select value={lead.stage} onChange={(event) => updateLead(lead.id, { stage: event.target.value })}>
                {leadStages.map((item) => <option key={item}>{item}</option>)}
              </select>
              <input type="number" min="0" value={lead.value} onChange={(event) => updateLead(lead.id, { value: Number(event.target.value) })} />
              <input type="number" min="0" value={lead.days} onChange={(event) => updateLead(lead.id, { days: Number(event.target.value) })} />
              <input value={lead.need} onChange={(event) => updateLead(lead.id, { need: event.target.value })} />
              <div className="row-actions">
                <button onClick={() => applyLead(lead)}>Use</button>
                <button className="ghost-danger" title="Delete lead" onClick={() => deleteLead(lead.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="task-panel">
          <div className="section-heading">
            <p className="eyebrow">Next Actions</p>
            <h2>Suggested follow-ups</h2>
          </div>
          <div className="task-list">
            {dueLeads.map((lead) => {
              const orderCount = leadOrderCount(lead);
              const serviceName = leadServiceName(lead);
              const priority = leadPriority(lead, rebookDays);
              const nextAction = leadNextAction(lead, rebookDays);

              return (
                <article className="task-item" key={lead.id}>
                  <button className="task-trigger" onClick={() => applyLead(lead)}>
                    <div>
                      <strong>{lead.name}</strong>
                      <span>{lead.stage} · {lead.days} days since contact · {serviceName}</span>
                    </div>
                    <span className={`priority-pill ${priority.toLowerCase()}`}>{priority}</span>
                  </button>
                  <div className="task-popover" role="status">
                    <div className="popover-topline">
                      <strong>{leadCustomerType(lead)}</strong>
                      <span>{priority} priority</span>
                    </div>
                    <div className="popover-grid">
                      <div>
                        <span>Orders</span>
                        <strong>{orderCount || "New"}</strong>
                      </div>
                      <div>
                        <span>Total value</span>
                        <strong>${lead.value || 0}</strong>
                      </div>
                      <div>
                        <span>Days waiting</span>
                        <strong>{lead.days}</strong>
                      </div>
                      <div>
                        <span>Service</span>
                        <strong>{serviceName}</strong>
                      </div>
                    </div>
                    <p>{nextAction}</p>
                    <small>Click the customer to load this follow-up into the message builder.</small>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="offer-section" id="offer">
        <div className="section-heading">
          <p className="eyebrow">Packages</p>
          <h2>Pick the level of help your shop needs.</h2>
        </div>
        <div className="offer-grid">
          <article className="pricing-card">
            <div className="price-top">
              <PackageCheck size={22} />
              <strong>Starter</strong>
            </div>
            <h3>$99</h3>
            <p>A focused starter pack for shops that want useful messages without a complicated setup.</p>
            <ul>
              <li>20 review reply templates</li>
              <li>20 rebooking reminders</li>
              <li>10 inquiry follow-ups</li>
              <li>Simple follow-up tracker</li>
            </ul>
          </article>
          <article className="pricing-card featured">
            <div className="price-top">
              <PackageCheck size={22} />
              <strong>Setup</strong>
            </div>
            <h3>$199</h3>
            <p>A customized setup with messages adjusted to your shop's tone and workflow.</p>
            <ul>
              <li>Everything in Starter</li>
              <li>Copy adapted to your tone</li>
              <li>30-minute setup walkthrough</li>
              <li>One 7-day review</li>
            </ul>
          </article>
          <article className="pricing-card">
            <div className="price-top">
              <PackageCheck size={22} />
              <strong>Done-for-you</strong>
            </div>
            <h3>$299</h3>
            <p>For busy teams that want the first real customer batch prepared for them.</p>
            <ul>
              <li>Everything in Setup</li>
              <li>Import up to 50 customers</li>
              <li>First real follow-up batch</li>
              <li>Two weeks of usage guidance</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="launch" id="launch">
        <div className="section-heading">
          <p className="eyebrow">How setup works</p>
          <h2>A clear path from sample to first message pack.</h2>
        </div>
        <div className="launch-grid">
          {[
            ["Step 1", "Review the free samples and decide whether the tone fits your shop."],
            ["Step 2", "Choose Starter, Setup, or Done-for-you based on how much help you want."],
            ["Step 3", "Share your services, current tools, and the kind of customers you want to follow up with."],
            ["Step 4", "Receive a ready-to-copy message pack and start using it in your normal workflow."],
          ].map(([day, text]) => (
            <div className="launch-card" key={day}>
              <strong>{day}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function OutputCard({ icon, title, text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await copyText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className="output-card">
      <header>
        <span>{icon}</span>
        <strong>{title}</strong>
        <button className="copy-button" title="Copy text" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </header>
      <pre>{text}</pre>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
