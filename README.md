# RWR: 16-bit Career Adventure

A retro 16-bit game that helps people explore their Ikigai (what they love, what they are good
at, what the world needs, and what they can be paid for) and turn it into a career roadmap.

Built for the 2026 Good Soil Fall Code Jam. Theme: **Season of Change**. A career transition is
the change RWR helps people navigate.

**Play it:** https://rwr-sigma.vercel.app

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
- Trail map: the four Ikigai circles scored 0 to 3 on evidence the player ticks, not on
  confidence. It names the strongest and thinnest circle and one small real-world step, and
  never names a "best career". For "what the world needs" the player picks from the UN's 17
  Sustainable Development Goals and is pointed to public job-outlook data to check it
- Lion upgrades: all seven slots are live. Levels are earned by what an entry says, not by its
  length, and even the first level asks for more than one thing: three skills, two full jobs,
  two courses with their years. Helpful tips can be switched off
- Pride Power runs to 50: 21 from upgrade levels, 12 from trail map evidence, 10 from real-world
  steps (2 each), and 7 from milestones, of which the roar is worth 3
- Den: levels up with each career path explored, meaning a lion with a main goal and evidence
  on its trail map, so starting a new game is not enough
- My Pride: add friends by QR code or link with no account, follow their lions, and send preset
  cheers. The Pride slot counts connections (friends, plus logged outreach such as a LinkedIn
  connection, an email about a job, or an interview) and needs 3, 10, then 25. Outreach is the
  player's own word, since RWR cannot see LinkedIn or email
- Wardrobe: cheers received and interviews landed earn sparks, which buy accessories that show
  on the lion everywhere it appears. One piece per group can be worn: fur, mane colour, hats,
  shades or glasses, and neck, and each piece comes in a few colours. A few pieces are gifts for
  progress instead, and the jewelled crown comes only with the roar. Every lion starts with
  none, and accessories need an account
- The mane grows in three sizes with the Mane upgrade, starting with a crest on top at level 1.
  Mane colours unlock at that point, and buying one changes only the colour (the lock on his
  forehead included), never the size
- Levels 1 to 4, Heart, Craft, Cause and Coin (`/level/heart` and so on): in each, Todah opens
  with a scripted question, asks three follow-ups about real moments, and then the talk
  becomes one claim and its evidence. The player checks and corrects that before it is marked
  on the trail map. Cause also asks the player to pick the needs they care about, and Coin
  never estimates pay. Without AI consent the same levels run from scripted questions
- The Crossroads (`/crossroads`): after the four levels, the circles are laid side by side,
  Todah names what lines up and one gap, and the player sets their own main goal. Todah never
  names a career
- The trail map is filled in by walking the levels. Once a circle has a claim the player can
  edit its words and evidence there
- Finishing a level earns 5 sparks, and the skill named in Craft can be added to the Claws
  upgrade in one press
- Guests can try any wardrobe piece on. Owning one still needs an account
- Quest 1 says plainly what the game is: the career version of Ikigai, a Western picture
  about ten years old, and not the Japanese idea itself, which is mostly about small daily
  things and rarely about a job. It also says what the AI does: it asks, the player decides
- Fur and mane come in matching sets built on colour theory: every coat has a mane of the same
  name, a deeper and stronger step from the coat's own colour, the way the natural mane sits
  with the golden coat. The two are separate pieces, so it takes one of each to match, and any
  coat can still be worn with any mane. The lookbook shows the six sets
- Accounts: log in, sign up, and a "Forgot password?" link that emails a reset link. A signed-in
  player can also change their password from the Privacy page
- Dev tools (`/dev`): for an account marked as a dev account, switches to unlock every
  accessory, pick the mane size and form, switch the roar on or off, and jump to any screen,
  so the game can be shown and tested without playing up to each stage
- Several lions: NEW GAME keeps the old lion under MY LIONS and starts a fresh one, which the
  player can name. Names go through a filter that refuses slurs
- Roar reward: set a goal, confirm it is reached, Todah becomes Pride Leader
- Looping music, sound effects, and an old-school TV frame around every screen, with TV static
  behind POWER ON
- Sound and motion toggles, reduced-motion support
- Privacy page: AI consent, save-on-device switch, delete my data

Not built yet: the roadmap, crossroads, profile card, Talk to Todah chat, PDF export, saving account progress to
the database.

## Technologies

- Next.js 16 (App Router) and React 19, TypeScript
- Supabase Auth and Postgres (free tier)
- Groq API (free tier, Zero Data Retention on) for Todah's replies, with Google Gemini as an
  optional fallback that is off by default for privacy
- Web Audio API for sound effects, CSS sprite animation
- obscenity (MIT) for the name filter, qrcode-generator (MIT) for My Pride's QR codes
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
- My Pride needs no account and no database. Your pride card (first name, lion, Pride Power,
  and your main goal if you leave that on) travels inside the link or QR code you share, in the
  part of the link that browsers never send to a server. Anyone you give the link to can read
  it.
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
- Title music (`public/audio/theme-loop.mp3`): a 24-second loop cut from "African Africa Music" by
  Tunetank, from Pixabay, used under the Pixabay Content License.
- Background music (`public/audio/background-loop.mp3`): a 67-second loop cut from "Lofi Mood" by
  Pulsebox, from Pixabay, used under the Pixabay Content License.
- Level-up sound (`public/audio/level-up.mp3`): "Achievement Unlock" by Universfield, from
  Pixabay, used under the Pixabay Content License.
- All audio is re-encoded as mono MP3 at 48 to 96 kbps with LAME to keep downloads small.
- Fonts: Press Start 2P, Pixelify Sans, and Atkinson Hyperlegible, all under the SIL Open Font
  License, loaded through `next/font`.

## Design and architecture

- Architecture and database diagrams: [docs/architecture/overview.md](docs/architecture/overview.md)
- Database schema: [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
- UI reference mockups: [docs/reference](docs/reference)
- Lookbook: every wardrobe piece in every colour, at `/lookbook` in the running game
- Mane progression sheet: [docs/design/mane-progression.html](docs/design/mane-progression.html),
  drawn by [scripts/mane-art.py](scripts/mane-art.py)

## Demo video

To be added.
