import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  AlertCircle,
  Check,
  Copy,
  Download,
  FileUp,
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
    label: "宠物美容",
    business: "Happy Paws Grooming",
    buyer: "宠物店老板",
    service: "full groom appointment",
    objection: "price",
    channels: ["SMS", "Email", "Instagram DM"],
    pain: "客户做完一次护理后没有自动复购提醒，Google 评论也经常没人回。",
    promise: "7 天内补齐复购提醒、未成交跟进和评论回复文案。",
  },
  medspa: {
    label: "医美/美容护理",
    business: "Glow Studio",
    buyer: "美容院老板",
    service: "facial treatment",
    objection: "trust",
    channels: ["SMS", "Email", "WhatsApp"],
    pain: "咨询客户多，但没有系统区分高意向和犹豫客户。",
    promise: "把咨询、复购和评价回复做成一套可复制流程。",
  },
  contractor: {
    label: "装修/维修承包商",
    business: "Northside Repairs",
    buyer: "维修公司老板",
    service: "estimate visit",
    objection: "schedule",
    channels: ["SMS", "Email", "Facebook DM"],
    pain: "报价后客户不回复，老板没有时间逐个追踪。",
    promise: "让报价后的 1/3/7 天跟进变得标准化。",
  },
};

const leadStages = ["新咨询", "已报价", "未回复", "已预约", "需复购"];
const tones = ["专业", "温暖", "简短", "挽回"];
const sampleOrdersCsv = `customer_name,email,phone,order_date,amount,service
Mia Chen,mia@example.com,555-0101,2026-04-24,85,dog bath + trim
Lucas Brown,lucas@example.com,555-0102,2026-04-21,140,two-dog grooming
Emma Davis,emma@example.com,555-0103,2026-03-17,75,monthly grooming
Mia Chen,mia@example.com,555-0101,2026-03-20,80,dog bath
Noah Wilson,noah@example.com,555-0104,2026-02-22,95,nail trim + bath`;
const sampleLeads = [
  { id: "lead-1", name: "Mia Chen", stage: "已报价", value: 85, days: 2, need: "dog bath + trim" },
  { id: "lead-2", name: "Lucas Brown", stage: "未回复", value: 140, days: 5, need: "two-dog grooming" },
  { id: "lead-3", name: "Emma Davis", stage: "需复购", value: 75, days: 34, need: "monthly grooming" },
];
const servicePackages = {
  Starter: {
    price: 99,
    promise: "24 小时内交付第一版文案包",
    deliverables: ["20 条评论回复模板", "20 条复购提醒文案", "10 条未成交跟进文案", "客户跟进表格"],
  },
  Setup: {
    price: 199,
    promise: "48 小时内交付定制文案包和设置说明",
    deliverables: ["Starter 全部内容", "按店铺语气改写", "30 分钟设置指导", "7 天后复盘一次"],
  },
  "Done-for-you": {
    price: 299,
    promise: "72 小时内整理首批真实客户并生成跟进包",
    deliverables: ["Setup 全部内容", "导入最多 50 个客户", "生成首批真实跟进文案", "提供 2 周使用建议"],
  },
};

function buildFollowUp({ businessName, leadName, stage, days, channel, service, objection, tone }) {
  const business = businessName.trim() || "Your business";
  const softer = tone === "温暖" ? "Hope you and your family are doing well." : "Quick follow-up.";
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
  const positive = rating >= 4;
  const apology = rating <= 2;
  const detail = review.trim() ? ` We appreciate you mentioning "${review.trim().slice(0, 70)}".` : "";

  if (apology) {
    return `Thank you for the feedback. I am sorry your experience with ${business} did not meet the standard we aim for.${detail} Please contact us directly so we can understand what happened and make this right.`;
  }

  if (positive) {
    return `Thank you for the ${rating}-star review. We are glad you had a good experience with ${business}.${detail} We appreciate your support and hope to see you again soon.`;
  }

  return `Thank you for taking the time to share this. We appreciate the honest feedback about ${business}.${detail} We will review this with the team and keep improving.`;
}

function buildRebook({ businessName, leadName, service, tone }) {
  const business = businessName.trim() || "Your business";
  const warm = tone === "温暖" ? "We loved having you in last time." : "It may be time to book again.";
  return `Hi ${leadName}, ${business} here. ${warm} Would you like me to reserve a spot for your next ${service}? I can send two available times.`;
}

function buildSamplePack({ prospectName, observation, service, tone }) {
  const business = prospectName.trim() || "your shop";
  const detail = observation.trim() || "your reviews and repeat-service flow look like a strong fit";
  const offer = service.trim() || "grooming appointment";
  const warmer = tone === "温暖" ? "Hope you are having a good week." : "Quick idea.";

  return {
    review: `Thanks so much for trusting ${business}. We are glad your visit went smoothly and appreciate you taking the time to leave a review. We hope to see you again for the next ${offer}.`,
    rebook: `Hi, ${business} here. ${warmer} It may be a good time to schedule your next ${offer}. Would you like me to send two easy appointment options for this week or next?`,
    inquiry: `Hi, thanks for reaching out to ${business}. I wanted to follow up in case your ${offer} question got buried. If timing or pricing is the main thing, I can help you pick the easiest next step.`,
    opener: `I noticed ${detail}. I made 3 quick examples below so you can see the tone before committing to anything.`,
  };
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
- Send the delivery email and mark the lead as 已预约 or 需复购`,
    deliveryEmail: `Subject: First draft for ${business}

Hi ${contact},

Here is the first draft of your ${clientPackage} retention kit.

Included:
${deliverables}

I focused on this goal: ${goal}

Please reply with any tone changes or examples that should sound more like your team. I can revise the first version once and then help you decide where to use each message.

Best,
Mason`,
  };
}

async function copyText(text) {
  await navigator.clipboard?.writeText(text);
}

function loadLeads() {
  try {
    const stored = localStorage.getItem("local-retention-kit-leads");
    return stored ? JSON.parse(stored) : sampleLeads;
  } catch {
    return sampleLeads;
  }
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
  if (days >= rebookDays * 2) return "未回复";
  if (days >= rebookDays || orderCount >= 2) return "需复购";
  return "已预约";
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
    stage: row.stage,
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
  const [niche, setNiche] = useState("pet");
  const [businessName, setBusinessName] = useState(niches.pet.business);
  const [rebookDays, setRebookDays] = useState(28);
  const [leadName, setLeadName] = useState("Mia");
  const [stage, setStage] = useState("已报价");
  const [days, setDays] = useState(3);
  const [channel, setChannel] = useState("SMS");
  const [service, setService] = useState(niches.pet.service);
  const [objection, setObjection] = useState("price");
  const [tone, setTone] = useState("温暖");
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

  const active = niches[niche];
  const followUp = useMemo(
    () => buildFollowUp({ businessName, leadName, stage, days, channel, service, objection, tone }),
    [businessName, leadName, stage, days, channel, service, objection, tone]
  );
  const reviewReply = useMemo(
    () => buildReviewReply({ businessName, rating, review, tone }),
    [businessName, rating, review, tone]
  );
  const rebook = useMemo(
    () => buildRebook({ businessName, leadName, service, tone }),
    [businessName, leadName, service, tone]
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
    setSyncStatus("正在读取云端客户...");
    const { data, error } = await supabase
      .from("leads")
      .select("id,name,stage,value,days_since_contact,service_need")
      .order("created_at", { ascending: true });

    if (error) {
      setSyncStatus(`云端读取失败：${error.message}`);
      return;
    }

    const cloudLeads = data.map(dbToLead);
    setLeads(cloudLeads.length > 0 ? cloudLeads : sampleLeads);
    setSelectedLeadId(cloudLeads[0]?.id || sampleLeads[0].id);
    setSyncStatus(cloudLeads.length > 0 ? "云端客户已同步。" : "云端暂无客户，先显示示例数据。");
  }

  async function signInWithEmail() {
    if (!authEmail.trim()) {
      setSyncStatus("请输入邮箱。");
      return;
    }

    setSyncStatus("正在发送登录链接...");
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo: window.location.href.split("#")[0].split("?")[0],
      },
    });

    setSyncStatus(error ? `登录链接发送失败：${error.message}` : "登录链接已发送，请检查邮箱。");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setSyncStatus("已退出，当前使用浏览器本地数据。");
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
      setSyncStatus(`保存失败：${error.message}`);
      return lead;
    }

    setSyncStatus("已保存到云端。");
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
      stage: "新咨询",
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
      setSyncStatus(error ? `删除失败：${error.message}` : "已从云端删除。");
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
      setImportStatus("没有识别到订单。请确认 CSV 有表头和至少一行订单。");
      return;
    }

    setLeads((current) => {
      const existing = new Map(current.map((lead) => [lead.name.toLowerCase(), lead]));
      imported.forEach((lead) => existing.set(lead.name.toLowerCase(), lead));
      return Array.from(existing.values());
    });
    applyLead(imported[0]);
    setImportStatus(`已导入 ${imported.length} 个客户，并按最近消费自动标记跟进阶段。`);
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
      stage: "已报价",
      value: intake.value,
      days: 0,
      need: `${intake.packageName} retention kit - ${intake.goal || active.service}`,
    };
    setLeads((current) => [lead, ...current]);
    applyLead(lead);
    setDeliveryStatus(`${intake.business} 已保存到交付队列，并加入客户跟进表。`);
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
    ].join("\n");
    downloadTextFile(`${sanitizeFileName(clientBusiness)}-${clientPackage.toLowerCase()}-delivery-pack.txt`, content);
    setDeliveryStatus("交付包已下载，可以作为付款后的第一版交付文档。");
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importOrdersCsvText(text);
    event.target.value = "";
  }

  const dueLeads = leads.filter((lead) => lead.stage === "未回复" || lead.stage === "已报价" || lead.stage === "需复购");
  const totalPipelineValue = leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const activePackage = servicePackages[clientPackage] || servicePackages.Starter;

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
            生成文案
          </a>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">15 天可投入的小服务项目</p>
            <h1>给本地服务商卖“复购 + 跟进 + 评论回复”自动化包</h1>
            <p>
              先不做重 SaaS。用可演示工具、行业模板和交付文档，包装成一次性部署服务，
              向宠物美容、美容护理、装修维修这类复购或报价驱动行业收费。
            </p>
            <div className="hero-actions">
              <a className="primary" href="#generator">
                试用 MVP <ArrowRight size={18} />
              </a>
              <a className="secondary" href="#launch">
                看 15 天计划
              </a>
              <a className="secondary" href="#offer">
                看报价
              </a>
              <a className="secondary" href="#sample-pack">
                生成免费样例
              </a>
              <a className="secondary" href="#intake">
                接单交付
              </a>
            </div>
          </div>

          <div className="signal-panel" aria-label="project signal">
            <div className="panel-header">
              <span>首选切入</span>
              <strong>{active.label}</strong>
            </div>
            <p>{active.pain}</p>
            <div className="metric-row">
              <div>
                <strong>$99-$299</strong>
                <span>首单报价</span>
              </div>
              <div>
                <strong>7 天</strong>
                <span>基础交付</span>
              </div>
              <div>
                <strong>15 天</strong>
                <span>可开始投放</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace" id="generator">
        <aside className="sidebar">
          <h2>选择垂直行业</h2>
          <div className="niche-list">
            {Object.entries(niches).map(([key, item]) => (
              <button
                className={key === niche ? "selected" : ""}
                key={key}
                onClick={() => switchNiche(key)}
              >
                <span>{item.label}</span>
                <small>{item.buyer}</small>
              </button>
            ))}
          </div>

          <div className="offer-box">
            <span>服务承诺</span>
            <p>{active.promise}</p>
          </div>

          <div className="settings-box">
            <span>商家设置</span>
            <label>
              店名
              <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
            </label>
            <label>
              复购周期
              <input
                type="number"
                min="1"
                value={rebookDays}
                onChange={(event) => setRebookDays(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="cloud-box">
            <span>数据保存</span>
            {!hasSupabaseConfig && (
              <p>当前是本地模式。配置 Supabase 后，客户数据可登录后云端保存。</p>
            )}
            {hasSupabaseConfig && session?.user && (
              <>
                <p>云端模式已开启：{session.user.email}</p>
                <button onClick={signOut}>退出登录</button>
              </>
            )}
            {hasSupabaseConfig && !session?.user && (
              <>
                <p>输入邮箱获取 magic link，登录后云端保存客户。</p>
                <input
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                />
                <button onClick={signInWithEmail}>发送登录链接</button>
              </>
            )}
            {syncStatus && <small>{syncStatus}</small>}
          </div>
        </aside>

        <section className="tool-surface">
          <div className="toolbar">
            <div>
              <p className="eyebrow">MVP Generator</p>
              <h2>客户跟进文案生成器</h2>
            </div>
            <button className="icon-button" title="Reset sample" onClick={() => {
              setLeadName("Mia");
              setStage("已报价");
              setDays(3);
              setReview("The team was friendly and my dog looked great.");
            }}>
              <RefreshCcw size={18} />
            </button>
          </div>

          <div className="form-grid">
            <label>
              客户名
              <input value={leadName} onChange={(event) => setLeadName(event.target.value)} />
            </label>
            <label>
              跟进阶段
              <select value={stage} onChange={(event) => setStage(event.target.value)}>
                {leadStages.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              距离上次沟通
              <input type="number" min="0" value={days} onChange={(event) => setDays(Number(event.target.value))} />
            </label>
            <label>
              渠道
              <select value={channel} onChange={(event) => setChannel(event.target.value)}>
                {active.channels.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              服务项目
              <input value={service} onChange={(event) => setService(event.target.value)} />
            </label>
            <label>
              主要顾虑
              <select value={objection} onChange={(event) => setObjection(event.target.value)}>
                <option value="price">价格</option>
                <option value="trust">信任</option>
                <option value="schedule">时间</option>
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
            <OutputCard icon={<MessageSquareText size={18} />} title="未成交跟进" text={followUp} />
            <OutputCard icon={<RefreshCcw size={18} />} title="复购提醒" text={rebook} />
          </div>
        </section>

        <section className="tool-surface review-tool">
          <div className="toolbar">
            <div>
              <p className="eyebrow">Review Assist</p>
              <h2>评论回复生成器</h2>
            </div>
            <Star size={22} />
          </div>
          <div className="form-grid compact">
            <label>
              星级
              <input type="number" min="1" max="5" value={rating} onChange={(event) => setRating(Number(event.target.value))} />
            </label>
            <label className="wide">
              评论内容
              <textarea value={review} onChange={(event) => setReview(event.target.value)} />
            </label>
          </div>
          <OutputCard icon={<Mail size={18} />} title="商家回复" text={reviewReply} />
        </section>
      </section>

      <section className="sample-section" id="sample-pack">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Free Sample Pack</p>
            <h2>给潜在客户看的 3 条免费样例</h2>
          </div>
          <p className="section-note">
            商家回复“可以看看”时，输入店名和观察点，复制这 3 条作为免费样例。
          </p>
        </div>

        <div className="sample-builder">
          <div className="form-grid">
            <label>
              商家名
              <input value={prospectName} onChange={(event) => setProspectName(event.target.value)} />
            </label>
            <label>
              服务项目
              <input value={sampleService} onChange={(event) => setSampleService(event.target.value)} />
            </label>
            <label>
              具体观察
              <input value={prospectObservation} onChange={(event) => setProspectObservation(event.target.value)} />
            </label>
          </div>
          <OutputCard icon={<Sparkles size={18} />} title="发样例前的开场句" text={samplePack.opener} />
          <div className="output-grid">
            <OutputCard icon={<Star size={18} />} title="评论回复样例" text={samplePack.review} />
            <OutputCard icon={<RefreshCcw size={18} />} title="复购提醒样例" text={samplePack.rebook} />
            <OutputCard icon={<MessageSquareText size={18} />} title="未成交跟进样例" text={samplePack.inquiry} />
          </div>
        </div>
      </section>

      <section className="intake-section" id="intake">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Client Intake</p>
            <h2>客户同意后，快速生成收款和交付包</h2>
          </div>
          <p className="section-note">
            用它把“客户说可以”变成可执行订单：确认套餐、生成 PayPal 备注、保存线索、下载交付文档。
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
                店名
                <input value={clientBusiness} onChange={(event) => setClientBusiness(event.target.value)} />
              </label>
              <label>
                联系人
                <input value={clientContact} onChange={(event) => setClientContact(event.target.value)} />
              </label>
              <label>
                客户邮箱
                <input placeholder="client@example.com" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} />
              </label>
              <label>
                交付时间
                <input value={clientDeadline} onChange={(event) => setClientDeadline(event.target.value)} />
              </label>
              <label>
                品牌语气
                <input value={clientVoice} onChange={(event) => setClientVoice(event.target.value)} />
              </label>
              <label>
                现有工具/数据
                <input value={clientTools} onChange={(event) => setClientTools(event.target.value)} />
              </label>
              <label className="full-span">
                客户目标
                <textarea value={clientGoal} onChange={(event) => setClientGoal(event.target.value)} />
              </label>
            </div>

            <div className="intake-actions">
              <button onClick={saveClientIntake}>
                <Check size={16} />
                保存为订单线索
              </button>
              <button onClick={downloadCurrentDeliveryPack}>
                <Download size={16} />
                下载交付包
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
              <span>当前套餐</span>
              <strong>${activePackage.price}</strong>
              <p>{activePackage.promise}</p>
            </div>
            <ul>
              {activePackage.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="recent-intakes">
              <span>最近订单线索</span>
              {intakes.length === 0 && <p>还没有保存订单。保存后这里会显示最近 8 个客户。</p>}
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
          <OutputCard icon={<PackageCheck size={18} />} title="PayPal 账单备注" text={deliveryPack.invoice} />
          <OutputCard icon={<Mail size={18} />} title="付款后确认邮件" text={deliveryPack.confirmation} />
          <OutputCard icon={<Check size={18} />} title="交付检查清单" text={deliveryPack.checklist} />
          <OutputCard icon={<Send size={18} />} title="第一版交付邮件" text={deliveryPack.deliveryEmail} />
        </div>
      </section>

      <section className="pipeline" id="crm">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Working CRM</p>
            <h2>可操作的客户跟进工作台</h2>
          </div>
          <div className="table-actions">
            <button onClick={createLead}>
              <Plus size={16} />
              新客户
            </button>
            <button onClick={saveCurrentLead}>
              <Check size={16} />
              保存当前客户
            </button>
            <button onClick={() => downloadLeadsCsv(leads)}>
              <Download size={16} />
              导出 CSV
            </button>
          </div>
        </div>

        <div className="import-panel">
          <div>
            <p className="eyebrow">Order Import</p>
            <h2>导入订单 CSV，自动找出该复购客户</h2>
            <p>
              支持 Square、Wix、Shopify、Clover 等后台导出的订单表。识别客户名、订单日期、金额和服务项目后，
              自动合并成客户跟进列表。
            </p>
          </div>
          <div className="import-actions">
            <label className="file-button">
              <FileUp size={16} />
              导入订单 CSV
              <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} />
            </label>
            <button onClick={() => importOrdersCsvText(sampleOrdersCsv)}>
              使用示例订单
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
            <span>客户/线索</span>
          </div>
          <div>
            <strong>{dueLeads.length}</strong>
            <span>需要跟进</span>
          </div>
          <div>
            <strong>${totalPipelineValue}</strong>
            <span>潜在金额</span>
          </div>
        </div>

        <div className="lead-table">
          <div className="lead-row table-head">
            <span>客户</span>
            <span>阶段</span>
            <span>金额</span>
            <span>未联系</span>
            <span>服务项目</span>
            <span>操作</span>
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
                <button onClick={() => applyLead(lead)}>生成</button>
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
            <h2>今天该跟进谁</h2>
          </div>
          <div className="task-list">
            {dueLeads.map((lead) => (
              <button key={lead.id} onClick={() => applyLead(lead)}>
                <strong>{lead.name}</strong>
                <span>{lead.stage} · {lead.days} 天未联系 · {lead.need}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="offer-section" id="offer">
        <div className="section-heading">
          <p className="eyebrow">Productized Service</p>
          <h2>直接拿去卖的服务包</h2>
        </div>
        <div className="offer-grid">
          <article className="pricing-card">
            <div className="price-top">
              <PackageCheck size={22} />
              <strong>Starter</strong>
            </div>
            <h3>$99</h3>
            <p>适合第一个试单，用低风险价格换案例和反馈。</p>
            <ul>
              <li>20 条评论回复模板</li>
              <li>20 条复购提醒文案</li>
              <li>10 条未成交跟进文案</li>
              <li>一个客户跟进表格</li>
            </ul>
          </article>
          <article className="pricing-card featured">
            <div className="price-top">
              <PackageCheck size={22} />
              <strong>Setup</strong>
            </div>
            <h3>$199</h3>
            <p>主推档位，包含按店铺风格定制和一次设置指导。</p>
            <ul>
              <li>Starter 全部内容</li>
              <li>按商家语气改写</li>
              <li>30 分钟视频设置指导</li>
              <li>7 天后复盘一次</li>
            </ul>
          </article>
          <article className="pricing-card">
            <div className="price-top">
              <PackageCheck size={22} />
              <strong>Done-for-you</strong>
            </div>
            <h3>$299</h3>
            <p>适合愿意省时间的老板，你直接帮他整理首批真实客户。</p>
            <ul>
              <li>Setup 全部内容</li>
              <li>导入最多 50 个客户</li>
              <li>生成首批真实跟进文案</li>
              <li>提供 2 周使用建议</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="launch" id="launch">
        <div className="section-heading">
          <p className="eyebrow">Go-to-market</p>
          <h2>15 天启动路线</h2>
        </div>
        <div className="launch-grid">
          {[
            ["1-3 天", "完善 Demo、截图、服务说明页，准备 3 个行业样例。"],
            ["4-6 天", "整理 60 个潜在客户名单：Google Maps、Instagram、本地商会目录。"],
            ["7-10 天", "每天发 15 条定制私信，附一段免费评论回复或跟进文案。"],
            ["11-15 天", "以 $99-$299 接首单，交付模板、设置教程和 7 天文案包。"],
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
