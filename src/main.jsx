import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  Clipboard,
  Copy,
  Mail,
  MessageSquareText,
  RefreshCcw,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import "./styles.css";

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
  { name: "Mia Chen", stage: "已报价", value: 85, days: 2, need: "dog bath + trim" },
  { name: "Lucas Brown", stage: "未回复", value: 140, days: 5, need: "two-dog grooming" },
  { name: "Emma Davis", stage: "需复购", value: 75, days: 34, need: "monthly grooming" },
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

function copyText(text) {
  navigator.clipboard?.writeText(text);
}

function App() {
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

  function switchNiche(next) {
    setNiche(next);
    setService(niches[next].service);
    setChannel(niches[next].channels[0]);
    setObjection(niches[next].objection);
  }

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

      <section className="pipeline">
        <div className="section-heading">
          <p className="eyebrow">Demo CRM</p>
          <h2>给客户看的“问题可视化”</h2>
        </div>
        <div className="lead-table">
          {sampleLeads.map((lead) => (
            <div className="lead-row" key={lead.name}>
              <span>{lead.name}</span>
              <span>{lead.stage}</span>
              <span>${lead.value}</span>
              <span>{lead.days} 天</span>
              <button onClick={() => {
                setLeadName(lead.name.split(" ")[0]);
                setStage(lead.stage);
                setDays(lead.days);
                setService(lead.need);
              }}>
                套用
              </button>
            </div>
          ))}
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
  return (
    <article className="output-card">
      <header>
        <span>{icon}</span>
        <strong>{title}</strong>
        <button className="copy-button" title="Copy text" onClick={() => copyText(text)}>
          <Copy size={16} />
        </button>
      </header>
      <pre>{text}</pre>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
