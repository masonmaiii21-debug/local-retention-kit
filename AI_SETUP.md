# AI Setup

The public GitHub Pages frontend must not contain `OPENAI_API_KEY`. Customers can use AI generation only when the frontend calls a server-side endpoint, and that endpoint calls OpenAI with the secret key.

This repo includes a Supabase Edge Function at:

```text
supabase/functions/generate-copy/index.ts
```

## Local behavior

If `VITE_AI_ENDPOINT` is empty, the app keeps working with local templates. The AI button will explain that the endpoint is not configured.

## Deploy the AI endpoint

1. Link the repo to a Supabase project.
2. Set the secret in Supabase, not in the frontend:

```bash
supabase secrets set OPENAI_API_KEY=your_server_side_key
```

Optional model override:

```bash
supabase secrets set OPENAI_MODEL=gpt-5.4-mini
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

## What the AI currently generates

- Natural review replies based on store name, industry, star rating, review text, and selected tone.
- If the AI endpoint fails, the UI falls back to the local template reply.

## Why this is customer-safe

- The customer only sees the public website and the generated answer.
- The OpenAI API key stays on Supabase as a server-side secret.
- The frontend receives only `{ "text": "..." }` from the function.
