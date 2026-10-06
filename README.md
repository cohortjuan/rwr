# RWR: 16-bit Career Adventure

A retro 16-bit game that helps people explore their Ikigai (what they love, what they are good
at, what the world needs, and what they can be paid for) and turn it into a career roadmap.

Built for the 2026 Good Soil Fall Code Jam. Theme: **Season of Change**. A career transition is
the change RWR helps people navigate.

Status: first playable scaffold (work in progress for the jam). See "What works today" below.

## Problem

Changing careers is confusing and lonely. Most career tools are forms and quizzes that flatter
you instead of helping you check whether you really want what you say you want.

## Solution

Todah, a lion cub, guides the player through short quests. He asks one question at a time,
reflects back what he hears, and gently looks for evidence. The player's resume is built as an
RPG equipment screen: each part of the lion grows as the matching resume section is filled in.
Todah does not roar until the player says their own goal is reached. He is a guide, not a
prophet: nothing in the game promises a job or an outcome.

## What works today

- Title screen: cub walks in, sits facing the player, title drops in, PRESS START
- Login box: log in / sign up (Supabase Auth) or play as guest
- Quest 1 (onboarding): scripted beats, then an AI warm-up with a scripted fallback ("trail
  notes"). Todah's text types out and his mouth moves while he talks
- Lion upgrades: four live resume slots with levels, three shown as coming soon
- Roar reward: set a goal, confirm it is reached, Todah becomes Pride Leader
- Looping music, sound effects, and an old-school TV frame around every screen
- Sound and motion toggles, reduced-motion support
- Privacy page: AI consent, save-on-device switch, delete my data

Not built yet: interview levels 1 to 4, crossroads, profile card, quest log, Talk to Todah chat,
PDF export, saving account progress to the database.

## Technologies

- Next.js 16 (App Router) and React 19, TypeScript
- Supabase Auth and Postgres (free tier)
- Groq API (free tier, Zero Data Retention on) for Todah's replies, with Google Gemini as an
  optional fallback that is off by default for privacy
- Web Audio API for sound effects, CSS sprite animation
- Hosting: Vercel

Everything used is free or open source.

## How to run

You need Node.js 22 or newer and npm.

```bash
npm install
```

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with your own keys (see the comments in that file). The game runs without
any keys: guest mode works and Todah uses his scripted lines.

```bash
npm run dev
```

Open http://localhost:3000. Add `?demo=1` to `/quest` to play the quest with zero AI calls.

## Privacy

Some answers in RWR are personal, so the game is built to collect as little as possible:

- Todah asks before any answer is sent to an AI service. Say no and the quest runs from
  scripted lines, entirely in your browser.
- Your name never leaves your device. Email addresses, links, and phone numbers are removed
  from answers before they are sent to the AI provider.
- The server does not log or store what you type, and there is no transcript table in the
  database. An account stores only your email (with Supabase Auth).
- Your game is saved in your browser (localStorage). The in-game Privacy page lets you turn
  that off on a shared computer and delete all of your data.
- AI providers have their own data terms. **While RWR is in testing, please leave out real
  names, employers, and anything you would not tell a stranger.**

## How AI was used

To be completed before submission. Running notes:

- Concept and design were worked out by Juan in conversation with Claude (Anthropic).
- Code scaffold written with Claude Code, directed and reviewed by Juan. Juan made the product
  decisions: name, character, guest mode, hosting, slot names, the roar rule, music and sound.
- Art (sprites, title mockups, reward still) is AI-generated (Gemini and others).
- In the game itself, Todah's interview replies come from an LLM. Everything else is scripted.

## Asset credits

- Roar sound (`public/audio/roar-reward.mp3`): source and license still to be verified.
- Music (`public/audio/theme-loop.mp3`): a 24-second loop cut from "African Africa Music" by
  Tunetank, from Pixabay, used under the Pixabay Content License.

## Design and architecture

- Architecture and database diagrams: [docs/architecture/overview.md](docs/architecture/overview.md)
- Database schema: [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
- UI reference mockups: [docs/reference](docs/reference)

## Demo video

To be added.
