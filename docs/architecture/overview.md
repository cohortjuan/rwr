# RWR architecture

Single Next.js (TypeScript, App Router) app. No separate backend service.

```mermaid
flowchart LR
  Browser[Browser: title, quest, upgrades, roar] -->|POST /api/todah| Route[Next.js server route]
  Route -->|primary| Gemini[Google Gemini API]
  Route -->|on 429, 5xx, timeout| Groq[Groq API]
  Browser -->|guest progress| LocalStorage[(localStorage)]
  Browser -->|log in, sign up| SupabaseAuth[Supabase Auth]
  SupabaseAuth --- Postgres[(Supabase Postgres)]
```

- LLM keys live only on the server (`.env.local` locally, host environment variables when deployed).
- The browser never calls an LLM directly.
- With no key set, or when both providers fail, the quest uses scripted lines from `lib/lines.ts`.

## Privacy by design

- Todah asks for consent before the first AI call. Without it, the quest runs from scripted
  lines entirely in the browser.
- The player's name is never sent to the server. The AI writes a `[NAME]` token and the browser
  fills it in.
- Email addresses, links, and phone numbers are scrubbed from answers before they reach a provider
  (`lib/scrub.ts`).
- The server route does not log or store answers.
- `/privacy` lets a player turn off saving on the device and delete all of their data.

## Database

Schema: `supabase/migrations/`. Every table has row level security so a player can only read
and write their own rows. There is no transcript table: what players type to Todah is never
stored in the database.

```mermaid
erDiagram
  auth_users ||--|| profiles : has
  auth_users ||--o{ interview_sessions : has
  auth_users ||--o{ claims : makes
  auth_users ||--o{ roadmap_steps : plans
  auth_users ||--o{ upgrades : fills
  auth_users ||--o| goals : sets
```

Status: the schema is applied to the Supabase project, but account progress is not synced to the
database yet. Progress is saved in the browser (localStorage) for guests and accounts alike.
