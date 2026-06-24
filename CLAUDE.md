# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev        # start dev server (Vite + TanStack Start SSR)
bun run build      # production build (Nitro/Cloudflare target)
bun run lint       # ESLint
bun run format     # Prettier
```

## Architecture

This project has **two distinct parts** that share the same repository:

### 1. Static marketing website (`public/site/`)
Plain HTML/CSS files served as static assets. The root route (`/`) immediately redirects to `/site/index.html`. The `supabase/functions/upload-lead-doc/` Deno edge function serves the lead document upload form on this site (PDF-only, 10 MB limit, JWT verification disabled — public endpoint).

### 2. React admin panel (`/auth`, `/admin-panel`)
A TanStack Start SSR app for Intserfin staff. Access is guarded by Supabase Auth + a `user_roles` table — users must have `role = 'admin'` in that table to enter the panel. The panel covers email marketing campaigns, leads management, and settings (email provider integration is placeholder/pending).

### Routing
File-based routing via TanStack Router. All routes live in `src/routes/`. `routeTree.gen.ts` is auto-generated — never edit it. Key conventions from `src/routes/README.md`:
- Dynamic segments: `$id.tsx` (not `{id}`)
- Splat params accessed as `_splat`, not `*`
- `__root.tsx` is the only app shell; preserving `<Outlet />` there is critical

### Supabase integration
- Client (`src/integrations/supabase/client.ts`): lazily initialized via a `Proxy`. Reads `VITE_SUPABASE_*` at build time and `SUPABASE_*` at SSR. Import as `import { supabase } from "@/integrations/supabase/client"`.
- Server-side auth middleware (`src/integrations/supabase/auth-middleware.ts`): use `requireSupabaseAuth` for server functions that need a validated user.
- Types (`src/integrations/supabase/types.ts`): auto-generated from Supabase schema. Key tables: `user_roles`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`. Key enum: `app_role` (`"admin" | "user"`). Email queue functions: `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`.

### Email infrastructure
Two server routes under `src/routes/lovable/email/` drive all outbound mail through the Lovable email service (`@lovable.dev/email-js`):
- **Auth emails** (`auth/webhook.ts`): a Supabase Auth webhook (signed via `@lovable.dev/webhooks-js`). It maps each auth action (`signup`, `invite`, `magiclink`, `recovery`, `email_change`, `reauthentication`) to a React Email template in `src/lib/email-templates/` and a subject line, renders it to HTML, and sends. Sender/domain constants (`SENDER_DOMAIN`, `FROM_DOMAIN`, etc.) are hard-coded at the top of the file. `auth/preview.ts` renders templates for local preview.
- **Queue processor** (`queue/process.ts`): drains the email queue (the `read_email_batch`/`delete_email`/`move_to_dlq` DB functions). Handles rate-limit (429 → retry with `Retry-After`), forbidden (403 → straight to DLQ), and `MAX_RETRIES` (5) exhaustion. Auth vs. transactional mail have different TTLs.

Email templates use `@react-email/components`. When adding an auth email type, add both the template and an entry in the `EMAIL_TEMPLATES`/`EMAIL_SUBJECTS` maps in `webhook.ts`.

### Build system
`vite.config.ts` imports from `@lovable.dev/vite-tanstack-config`, which bundles many plugins automatically (TanStack Start, React, Tailwind CSS v4, tsconfig paths, Nitro, etc.). **Do not add those plugins manually** — duplicating them breaks the build. Pass extra config through the `defineConfig` options object.

`src/server.ts` wraps TanStack Start's SSR entry to catch h3-swallowed 500 errors and render a plain HTML error page instead.

### UI components
Shadcn UI (new-york style, Tailwind v4, `cssVariables: true`). Components live in `src/components/ui/`. Use the `@/` path alias (resolves to `src/`). Icon library: Lucide React. Toasts via Sonner.
