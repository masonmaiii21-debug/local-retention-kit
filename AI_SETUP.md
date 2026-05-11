# AI Setup

The public GitHub Pages frontend must not contain `OPENAI_API_KEY`. Customers can use AI generation only when the frontend calls a server-side endpoint, and that endpoint calls OpenAI with the secret key.

Current operating decision: do not add OpenAI credits yet. The product can still be sold and delivered with the built-in fallback generator. This keeps the first revenue test cheap while avoiding a broken customer workflow.

This repo includes a Supabase Edge Function at:

```text
supabase/functions/generate-copy/index.ts
```

## Local behavior

If `VITE_AI_ENDPOINT` is empty, the app keeps working with local templates. If the endpoint exists but OpenAI has no available API credits, the function returns a review-specific fallback reply.

## Deploy the AI endpoint

1. Link the repo to a Supabase project.
2. Set the secret in Supabase, not in the frontend:

```bash
supabase secrets set OPENAI_API_KEY=your_server_side_key
```

Optional model override:

```bash
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

3. Deploy the function:

```bash
supabase functions deploy generate-copy
```

4. Add the function URL to GitHub Actions variables:

```text
VITE_AI_ENDPOINT=https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-copy
```

After GitHub Pages rebuilds, the public website can call the AI endpoint without exposing the OpenAI key.

## No-credit operating mode

Use this mode until the first paid customer or until true OpenAI output is worth the cost.

- Keep selling the offer as a retention and review-response setup, not as a full AI SaaS.
- Use the generated fallback replies for demos and first delivery packs.
- Do not promise unlimited AI generation to customers.
- Add $5-$10 of OpenAI API credits later only when true OpenAI output becomes necessary.

## What the AI currently generates

- Natural review replies based on store name, industry, star rating, review text, and selected tone.
- If OpenAI is temporarily unavailable, the server returns a review-specific fallback reply instead of failing the customer workflow.

## Why this is customer-safe

- The customer only sees the public website and the generated answer.
- The OpenAI API key stays on Supabase as a server-side secret.
- The frontend receives only `{ "text": "..." }` from the function.
