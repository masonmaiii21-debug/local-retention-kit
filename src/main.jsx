import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
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
const sampleLeads = [
  { id: "lead-1", name: "Mia Chen", stage: "已报价", value: 85, days: 2, need: "dog bath + trim" },
  { id: "lead-2", name: "Lucas Brown", stage: "未回复", value: 140, days: 5, need: "two-dog grooming" },
  { id: "lead-3", name: "Emma Davis", stage: "需复购", value: 75, days: 34, need: "monthly grooming" },
];

function buildFollowUp({ niche, leadName, stage, days, channel, service, objection, tone }) {
  const business = niches[niche].business;
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

function buildReviewReply({ niche, rating, review, tone }) {
  const business = niches[niche].business;
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

function buildRebook({ niche, leadName, service, tone }) {
  const business = niches[niche].business;
  const warm = tone === "温暖" ? "We loved having you in last time." : "It may be time to book again.";
  return `Hi ${leadName}, ${business} here. ${warm} Would you like me to reserve a spot for your next ${service}? I can send two available times.`;
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
  const [selectedLeadId, setSelectedLeadId] = useState("lead-1");
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [niche, setNiche] = useState("pet");
  const [leadName, setLeadName] = useState("Mia");
  const [stage, setStage] = useState("已报价");
  const [days, setDays] = useState(3);
  const [channel, setChannel] = useState("SMS");
  const [service, setService] = useState(niches.pet.service);
  const [objection, setObjection] = useState("price");
  const [tone, setTone] = useState("温暖");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("The team was friendly and my dog looked great.");

  const active = niches[niche];
  const followUp = useMemo(
    () => buildFollowUp({ niche, leadName, stage, days, channel, service, objection, tone }),
    [niche, leadName, stage, days, channel, service, objection, tone]
  );
  const reviewReply = useMemo(
    () => buildReviewReply({ niche, rating, review, tone }),
    [niche, rating, review, tone]
  );
  const rebook = useMemo(
    () => buildRebook({ niche, leadName, service, tone }),
    [niche, leadName, service, tone]
  );

  useEffect(() => {
    localStorage.setItem("local-retention-kit-leads", JSON.stringify(leads));
  }, [leads]);

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

  const dueLeads = leads.filter((lead) => lead.stage === "未回复" || lead.stage === "已报价" || lead.stage === "需复购");
  const totalPipelineValue = leads.reduce((sum, lead) => sum + Number(lead.value || 0), 0);

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
