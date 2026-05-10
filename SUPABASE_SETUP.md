# Supabase Setup

This project works without Supabase by saving leads in the browser. Add Supabase when you want real user accounts and cloud-saved customer data.

## 1. Create a Supabase project

Create a project from the Supabase dashboard, then open the SQL editor and run:

```sql
-- paste the contents of supabase/schema.sql here
```

The schema creates a `public.leads` table, enables Row Level Security, and adds policies so each authenticated user can only access their own leads.

## 2. Add environment variables locally

Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Use the Project URL and publishable key from Supabase. These values are safe to expose in the browser when RLS is enabled.

## 3. Add environment variables for GitHub Pages

In GitHub:

1. Open the repository settings.
2. Go to Secrets and variables -> Actions -> Variables.
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

The deploy workflow reads those variables during `npm run build`.

## 4. Auth redirect URL

In Supabase Auth URL settings, add:

```text
https://masonmaiii21-debug.github.io/local-retention-kit/
```

Also add your local dev URL if needed:

```text
http://127.0.0.1:5173/local-retention-kit/
```

## 5. Run

```bash
npm install
npm run dev
```

If the Supabase variables are missing, the app automatically falls back to browser-only local storage.
