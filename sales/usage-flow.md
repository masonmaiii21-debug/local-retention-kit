# Local Retention Kit Usage Flow

This is the operating flow for using the project to find a small local-business customer, collect payment, and deliver the first retention kit.

```mermaid
flowchart TD
  A["Find local service businesses"] --> B["Send email or Instagram DM"]
  B --> C{"Business replies?"}
  C -- "No" --> D["Wait 2-3 days, then send one soft follow-up"]
  D --> B
  C -- "Yes, wants to see examples" --> E["Open Free Sample Pack generator"]
  E --> F["Send 3 custom sample messages"]
  F --> G{"Business agrees to paid setup?"}
  G -- "No" --> H["Record as later follow-up in CRM"]
  H --> B
  G -- "Yes" --> I["Open Client Intake section"]
  I --> J["Choose package: Starter, Setup, or Done-for-you"]
  J --> K["Fill business, contact, email, goal, tools, and deadline"]
  K --> L["Generate PayPal invoice note and confirmation email"]
  L --> M["Send PayPal invoice manually"]
  M --> N{"Payment received?"}
  N -- "No" --> O["Send polite payment reminder"]
  O --> M
  N -- "Yes" --> P["Download full delivery pack"]
  P --> Q["Review and adjust tone for the business"]
  Q --> R["Send first draft delivery email"]
  R --> S["Track reply and revision request in CRM"]
  S --> T["Ask for testimonial or upsell monthly support"]
```

## Operator Checklist

1. Start with one niche, preferably pet grooming until the first paid proof is done.
2. Use the live website during outreach so the prospect sees a working demo.
3. For every interested prospect, create a free sample pack before asking for payment.
4. Only create/send a PayPal invoice after the prospect clearly agrees to a package.
5. After payment, use the Client Intake section to download the full delivery pack.
6. Deliver the first version quickly, then ask for a simple testimonial after they approve it.

## Resume Summary

Built a React/Vite productized-service MVP that supports prospect outreach, sample generation, client intake, payment preparation, CRM tracking, CSV order import, and downloadable delivery packs for local service businesses.
