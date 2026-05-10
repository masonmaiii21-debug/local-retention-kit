# Local Retention Kit

一个面向本地服务商的轻量 MVP：帮助宠物美容、美容护理、装修维修等小商家生成未成交跟进、复购提醒和评论回复文案。

这个版本刻意不接 OpenAI API，目标是 15 天内能拿去演示、投放、接第一笔小单。拿到反馈后，再升级为 API 驱动的真正 AI 生成器。

## 为什么选这个方向

- 泛 CRM、泛 AI 评论回复竞争很大，很多工具已经按月收费。
- 垂直小行业更容易成交，因为客户不是买软件，而是买“多拿复购、少漏跟进、评论有人回”的结果。
- 宠物美容、医美护理、装修维修都有明确的复购或报价后跟进场景。
- 首单可以先卖服务包，而不是卖 SaaS 订阅。

## MVP 功能

- 垂直行业切换：宠物美容、医美/美容护理、装修/维修承包商
- 未成交客户跟进文案生成
- 复购提醒文案生成
- Google/Yelp 等评论回复文案生成
- 可编辑客户管道，自动保存到浏览器
- Supabase 配置存在时支持登录和云端保存
- 导入订单 CSV，按客户合并订单并自动标记复购/跟进状态
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

## 变现包装

建议不要说“卖一个软件”，而是说：

> 我帮本地服务商搭一套轻量客户复购和评论回复流程，包含未成交跟进、复购提醒、评论回复模板和 7 天可直接使用的文案。

首单定价：

- $99：模板 + 文案包 + 30 分钟设置指导
- $199：按行业定制 + 20 条真实客户跟进文案
- $299：包含一个可分享的页面、模板库、7 天后复盘

## 简历写法

**Local Retention Kit - Vertical SaaS MVP**

- Built a React/Vite MVP for local service businesses to generate follow-up, rebooking, and review-response copy across multiple verticals.
- Designed a niche-first go-to-market workflow targeting pet grooming, med spa, and contractor businesses.
- Implemented reusable content-generation logic, responsive UI, and a demo CRM pipeline to support productized service sales.
