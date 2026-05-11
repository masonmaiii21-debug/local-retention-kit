# Local Retention Kit

一个面向宠物美容、移动美容、宠物日托/寄养等本地宠物服务商的轻量 MVP：帮助商家生成未成交跟进、复购提醒和评论回复文案。

这个版本前端不暴露 OpenAI API key。评论回复可以通过 Supabase Edge Function 走服务端生成；如果 OpenAI API 没有充值或临时不可用，系统会自动返回按评论内容定制的备用回复，避免客户流程中断。

Live demo:

```text
https://masonmaiii21-debug.github.io/local-retention-kit/
```

## 为什么选这个方向

- 泛 CRM、泛 AI 评论回复竞争很大，很多工具已经按月收费。
- 垂直小行业更容易成交，因为客户不是买软件，而是买“多拿复购、少漏跟进、评论有人回”的结果。
- 先聚焦宠物服务商，因为复购周期清晰、评论重要、老板常用短信/Instagram/Email 跟进客户。
- 首单可以先卖服务包，而不是卖 SaaS 订阅。

## MVP 功能

- 宠物服务商专用演示：宠物美容、移动美容、宠物日托/寄养优先
- 未成交客户跟进文案生成
- 复购提醒文案生成
- 新用户优惠生成器：生成首单福利、增值服务、推荐奖励或二次预约奖励，并附带规则和发布文案
- Google/Yelp 等评论回复文案生成
- 多语言评论甄别：按英文、中文、西班牙语、法语、德语、日语、韩语等评论内容和星级实时识别 positive / neutral / mixed / negative、语言、问题类型、严重程度和建议动作，再统一生成英文回复
- 可编辑客户管道，自动保存到浏览器
- Supabase 配置存在时支持登录和云端保存
- 导入订单 CSV，按客户合并订单并自动标记复购/跟进状态
- 可编辑商家名称、复购周期和客户服务项目
- 首页 CTA 可点击跳转到生成器、报价和 15 天路线
- 免费样例包生成器：给潜在客户生成评论回复、复购提醒、未成交跟进 3 条样例
- 客户接单表：记录店名、联系人、套餐、目标、现有工具和交付时间
- 完整交付包生成器：生成 PayPal 备注、确认邮件、交付清单、20 条评论回复、20 条复购提醒、10 条跟进文案、5 个新用户优惠方案和 7 天使用计划
- 可选智能评论回复：配置后端 endpoint 后，可根据不同评论生成更自然的回复；OpenAI API 未充值时自动使用备用生成
- 英文客户展示区和 ROI 计算器：方便给美国本地商家解释复购跟进的价值
- 一键套用客户生成文案
- 导出客户 CSV
- 15 天启动路线

## 本地运行

```bash
npm install
npm run dev
```

默认地址通常是 `http://127.0.0.1:5173`。

## 云端保存

Supabase 配置步骤见 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)。
AI 评论回复配置见 [AI_SETUP.md](AI_SETUP.md)。

## 客户交付

成交后的演示流程、订单导入、首批文案生成和交付清单见 [sales/client-handoff.md](sales/client-handoff.md)。
开始找第一个客户的执行清单见 [sales/day-1-outreach-plan.md](sales/day-1-outreach-plan.md)。
第一批潜在客户名单见 [sales/prospect-list-template.csv](sales/prospect-list-template.csv)，前 5 条私信草稿见 [sales/first-5-message-drafts.md](sales/first-5-message-drafts.md)。
第二批邮件草稿见 [sales/second-batch-message-drafts.md](sales/second-batch-message-drafts.md)。
跟进邮件草稿见 [sales/follow-up-message-drafts.md](sales/follow-up-message-drafts.md)。
已准备好的 3 套免费样例见 [sales/ready-sample-packs.md](sales/ready-sample-packs.md)。
已创建的 Gmail 草稿记录见 [sales/gmail-drafts-created.md](sales/gmail-drafts-created.md)。
Instagram 账号核对见 [sales/instagram-accounts.md](sales/instagram-accounts.md)，DM 草稿见 [sales/instagram-dm-drafts.md](sales/instagram-dm-drafts.md)。
Instagram 已发送/待发送记录见 [sales/instagram-dms-sent.md](sales/instagram-dms-sent.md)。
PayPal 收款发票模板见 [sales/paypal-invoice-templates.md](sales/paypal-invoice-templates.md)。
PayPal 发票创建状态见 [sales/paypal-invoice-status.md](sales/paypal-invoice-status.md)。
完整使用流程图和操作 SOP 见 [sales/usage-flow.md](sales/usage-flow.md)。
项目完成说明见 [sales/project-completion-report.md](sales/project-completion-report.md)。

## 变现包装

建议不要说“卖一个软件”，而是说：

> 我帮本地服务商搭一套轻量客户复购和评论回复流程，包含未成交跟进、复购提醒、评论回复模板和 7 天可直接使用的文案。

首单定价：

- $99：模板 + 文案包 + 30 分钟设置指导
- $199：按行业定制 + 20 条真实客户跟进文案
- $299：包含一个可分享的页面、模板库、7 天后复盘

## 简历写法

**Local Retention Kit - Vertical SaaS MVP**

- Built a React/Vite MVP for pet service businesses to generate follow-up, rebooking, and review-response copy.
- Designed a niche-first go-to-market workflow targeting pet grooming and local pet service businesses.
- Implemented reusable content-generation logic, responsive UI, and a demo CRM pipeline to support productized service sales.
