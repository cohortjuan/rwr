# RWR: 16-bit Career Adventure

A retro 16-bit game that helps people explore the four circles of the purpose diagram (what they
love, what they are good at, what the world needs, and what they can be paid for) and turn them
into one goal of their own and a plan to walk toward it.

Built for the 2026 Good Soil Fall Code Jam. Theme: **Season of Change**. A career transition is
the change RWR helps people navigate.

**Play it:** https://rwr-sigma.vercel.app

**How it was built:** the RWR Trail Log, a short build log with a look under the hood at each
stop: https://cohortjuan.github.io/rwr/

Status: playable from the title screen to the roar, and still being built for the jam (deadline
November 27, 2026). See "What works today" and "Not built yet" below.

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

### The trail

- Title screen: the cub walks in, stops, and fades into the seated cub facing the player. The
  title drops in, then PRESS START. A returning player gets CONTINUE and NEW GAME, and MY
  LIONS once a lion has been kept.
  Where the browser needs a tap before it allows sound, the screen starts switched off behind
  TV static and POWER ON
- Login box: log in / sign up (Supabase Auth) or play as guest
- Quest 1 (onboarding): scripted beats, then an AI warm-up with a scripted fallback ("trail
  notes"). Todah's text types out and his mouth moves while he talks
- Levels 1 to 4, Heart, Craft, Cause and Coin (`/level/heart` and so on): in each, Todah opens
  with a scripted question and asks three follow-ups about real moments. The one in the
  middle is a quick round with nothing to type: the player taps the answer that fits, or
  chooses to type their own. Then the talk becomes one claim and its evidence. The player checks and corrects that before it is marked
  on the trail map. Cause also asks the player to pick the needs they care about, and Coin
  never estimates pay. Without AI consent the same levels run from scripted questions. Each
  level ends at a resting point: Todah says how many of the four are walked and that
  everything is saved, and REST HERE sits beside going on
- Todah remembers: each level's AI prompt carries what the player said on earlier levels and
  in Quest 1, so he can pick up a thread ("that sounds like the fixing you told me about")
- Trail map (`/map`): the four circles scored 0 to 3 on evidence the player ticks, not on
  confidence. It names the strongest and thinnest circle and one small real-world step, and
  never names a "best career". For "what the world needs" the player picks from the UN's 17
  Sustainable Development Goals and is pointed to public job-outlook data to check it. The map
  is filled in by walking the levels, and once a circle has a claim the player can edit its
  words and evidence there
- A friend's witness (`/witness`): the player sends one question to someone who knows them,
  "What would you come to me for?" The answer comes back in a link, with no account and no
  server, and is kept beside the Craft circle
- The Crossroads (`/crossroads`): after the four levels, the circles are laid side by side and
  Todah names what lines up and one gap. If the player asks, he lays out three paths to test,
  each a real full-time occupation built from the player's own words: the path they are on,
  the path next door, and the bigger leap. He never calls one right, likely or well paid.
  Each path shows a rough pay range, says plainly that it may be out of date, and links to
  O*NET OnLine for current figures. Taking a path sets the main goal. The player can always
  write their own goal instead, and Todah gives his thoughts either way. Without AI replies
  the player gets three questions to find the paths themselves
- Trail Card (`/card`): a keepsake once the goal is set, with the player's lion, their four
  circles in their own words, their goal and their first step
- A letter to yourself: at the Crossroads the player can seal a letter to their future self.
  It opens when the goal is reached, or in 30, 60 or 90 days. It stays on the device and is
  never sent to the AI
- The road (`/road`): after the goal is set, the player names what is most likely to get in
  the way. One AI call drafts an if-then plan for it and three small real-world experiments
  from the player's own words, which the player edits. After doing one, they tell Todah how
  it went, he answers once, and they decide whether anything on the map has changed
- The roar (`/roar`): when the player says the goal is reached, they press and hold to let
  Todah roar (a plain press works too). The music cuts so the roar is the only sound, the sun
  comes up, and Todah becomes Pride Leader. Then come credits made of the player's own trail,
  which ROLL THE CREDITS plays on the whole screen
- Todah's note (`/letter`): the final gift, once the player says their goal is reached. A
  handwritten note left on a wooden desk, signed with an inked paw print, with a snapshot of
  the player's own lion taped to it. It is made from what the player said along the way. With
  AI replies on, Todah writes it and adds his two cents, so no two are alike. Without them it
  is put together from the player's own words. It is kept with the lion and can be saved as a
  picture or sent to someone. It is the one place the game leaves its 16-bit look, on purpose

### The lion

- Lion or lioness: chosen with the lion's name, and it can be changed later in the wardrobe.
  A lion grows a mane. A lioness grows an aura, and has essentials and bags of her own
- Lion upgrades (`/upgrades`): all seven slots are live. Levels are earned by what an entry
  says, not by its length, and even the first level asks for more than one thing: three
  skills, two full jobs, two courses with their years. Helpful tips can be switched off
- Pride Power runs to 50: 21 from upgrade levels, 12 from trail map evidence, 10 from real-world
  steps (2 each), and 7 from milestones, of which the roar is worth 3
- Den: levels up with each career path explored, meaning a lion with a main goal and evidence
  on its trail map, so starting a new game is not enough
- My Pride (`/pride`): add friends by QR code or link with no account, follow their lions, and
  send preset cheers. The Pride slot counts connections (friends, plus logged outreach such as
  a LinkedIn connection, an email about a job, or an interview) and needs 3, 10, then 25.
  Outreach is the player's own word, since RWR cannot see LinkedIn or email
- Wardrobe (`/wardrobe`): sparks buy accessories that show on the lion everywhere it appears.
  Sparks come from levels walked (5 each), real-world steps (3 each), cheers received (1 each)
  and interviews landed (25 each). The groups are fur, mane color, essentials, hats, shades
  and glasses, ears, neck, jackets, bags and transformations, and each piece comes in a few
  colors. One piece per group is worn, except essentials: up to three stand on the floor by a
  lioness's paws. A transformation (a green shishi, the guardian lion) is a whole picture that
  replaces the lion while it is on. A few pieces are gifts for progress, and the jeweled crown
  comes only with the roar. Guests can try any piece on. Owning one needs an account
- The mane grows in three sizes with the Mane upgrade, starting with a crest on top at level 1.
  Mane colors unlock at that point, and buying one changes only the color (the lock on his
  forehead included), never the size
- Fur and mane come in matching sets built on color theory: every coat has a mane of the same
  name, a deeper and stronger step from the coat's own color, the way the natural mane sits
  with the golden coat. The two are separate pieces, so it takes one of each to match, and any
  coat can still be worn with any mane. The lookbook (`/lookbook`) shows the six sets
- Wardrobe ideas: a player can send one line suggesting a new piece, which is emailed to the
  maker. Three a day per browser, and the form is hidden when no mailbox is set
- Finishing a level earns 5 sparks, and the skill named in Craft can be added to the Claws
  upgrade in one press
- Several lions: NEW GAME keeps the old lion under MY LIONS and starts a fresh one, which the
  player can name. Names go through a filter that refuses slurs

### Around the game

- A back arrow and a home button in the corner of every screen: the arrow returns to the
  screen the player was on before, and the house goes to the title
- SPEAK beside the answer boxes: the player can say an answer in place of typing it, in
  browsers that can turn speech into text (not Firefox). The words land in the box to be
  checked and changed before they are sent, and the music goes quiet while the mic is on
- SETTINGS, one box on every screen: sound (full, low or off), motion, the TV set, and the way
  to the Privacy page. Reduced motion is respected from the system setting too
- Looping music, sound effects, and old-school TV scanlines over every screen. On a wide screen
  (a computer, or a tablet or phone held sideways) the game is framed by an old TV set drawn
  in CSS, which TV SET under SETTINGS switches off
- A fair share of the AI: a daily count per browser and a per-minute count per address keep
  one visitor from using up the free AI for everyone. Past the limit the game carries on from
  scripted lines
- Quest 1 and the About page (`/about`) say plainly where the game's ideas come from. The
  four circles are the purpose diagram drawn by Andres Zuzunaga in 2011, which Marc Winn
  relabeled "ikigai" in 2014. Ikigai itself is a Japanese idea about what makes life worth
  living, described by Mieko Kamiya in 1966, and has nothing to do with being paid. RWR uses
  the diagram, puts PURPOSE in its middle, and does not claim to teach ikigai. Both also say
  what the AI does: it asks, the player decides
- Accounts: log in, sign up, and a "Forgot password?" link that emails a reset link. A signed-in
  player can also change their password from the Privacy page
- Privacy page (`/privacy`): where every kind of answer goes, AI consent, the save-on-device
  switch, and delete my data
- Dev tools (`/dev`): for an account marked as a dev account, switches to unlock every
  accessory, pick the mane size and form, switch the roar on or off, deliver a sealed letter,
  and jump to any screen, so the game can be shown and tested without playing up to each stage
- The game's text, and what the AI writes, is in American English

## Not built yet

- Saving the Trail Card as a picture
- Talk to Todah (a free chat outside the levels)
- PDF export of the resume built on the upgrades screen
- Saving account progress to the database: a game is kept in the browser for guests and
  accounts alike

## Technologies

- Next.js 16 (App Router) and React 19, TypeScript
- Supabase Auth and Postgres (free tier)
- Groq API (free tier, Zero Data Retention on) for Todah's replies, with Google Gemini as an
  optional fallback that is off by default for privacy
- Web Audio API for sound effects, CSS sprite animation
- Web Speech API (built into the browser, no key and no cost) for speaking an answer
- obscenity (MIT) for the name filter, qrcode-generator (MIT) for My Pride's QR codes
- Nodemailer (MIT No Attribution) to email wardrobe ideas to the maker from the maker's own
  mailbox. Optional: with no mailbox set, the form is hidden
- Python with Pillow for the scripts that cut and recolor the pixel art
- Hosting: Vercel for the game, and GitHub Pages (published by a GitHub Actions workflow) for
  the build log

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

The build log is one HTML file with no build step. To read it locally:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory blog
```

Then open http://localhost:4173.

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
- Speaking an answer is done by the browser, not by RWR. Most browsers send the sound to
  their maker's speech service (Google for Chrome, Apple for Safari) to turn it into words.
  RWR never receives the sound, and the game says so and asks before the mic is first used.
- The letter you seal for yourself stays on your device and is never sent to the AI.
- A wardrobe idea is emailed to the maker with whether your lion is a lion or a lioness, and
  nothing else about you or your game.
- Your game is saved in your browser (localStorage). The in-game Privacy page lets you turn
  that off on a shared computer and delete all of your data.
- AI providers have their own data terms. **While RWR is in testing, please leave out real
  names, employers, and anything you would not tell a stranger.**

## How AI was used

To be completed before submission. Running notes:

- Concept and design were worked out by Juan in conversation with Claude (Anthropic).
- The code was written with Claude Code, directed, play-tested and reviewed by Juan. Juan made
  the product decisions: name, character, guest mode, hosting, slot names, the roar rule, music
  and sound, the lion and lioness wardrobes, the old TV set, that a path taken at the
  Crossroads becomes the goal, how pay is shown, the endings (the Trail Card, the sealed
  letter, the held roar and its credits), speaking answers, and the back arrow and home button.
- Art (sprites, title mockups, reward still, wardrobe sheets) is AI-generated (Gemini and
  others), then cut, cleaned and recolored by the scripts in `scripts/`.
- In the game itself an LLM writes what Todah says in the interviews, turns each level's talk
  into a claim and its evidence for the player to correct, says what lines up at the
  Crossroads, lays out three paths to test when asked, gives his thoughts on the goal, drafts
  the road plan, answers each check-in, and writes his note at the end. Every one of these
  has a scripted fallback except his thoughts on the goal, which are simply left out. The
  player decides what any of it means.
- Turning a spoken answer into text is done by the browser, and is not part of RWR's own AI.
- The build log (https://cohortjuan.github.io/rwr/) tells who did what, and what was turned
  down.

## Asset credits

- Roar sound (`public/audio/roar-reward.mp3`): source and license still to be verified.
- Title music (`public/audio/theme-loop.mp3`): a 24-second loop cut from "African Africa Music" by
  Tunetank, from Pixabay, used under the Pixabay Content License.
- Background music (`public/audio/background-loop.mp3`): a 67-second loop cut from "Lofi Mood" by
  Pulsebox, from Pixabay, used under the Pixabay Content License.
- Level-up sound (`public/audio/level-up.mp3`): "Achievement Unlock" by Universfield, from
  Pixabay, used under the Pixabay Content License.
- All audio is re-encoded as mono MP3 at 48 to 96 kbps with LAME to keep downloads small.
- Fonts: Press Start 2P, Pixelify Sans, Atkinson Hyperlegible, and Kalam (the handwriting in
  Todah's note), all under the SIL Open Font License, loaded through `next/font`.

## Design and architecture

- Architecture and database diagrams: [docs/architecture/overview.md](docs/architecture/overview.md)
- Database schema: [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)
- UI reference mockups: [docs/reference](docs/reference)
- Build log: [blog/index.html](blog/index.html), published at https://cohortjuan.github.io/rwr/
  by [.github/workflows/blog.yml](.github/workflows/blog.yml)
- Lookbook: every wardrobe piece in every color, at `/lookbook` in the running game
- Mane progression sheet: [docs/design/mane-progression.html](docs/design/mane-progression.html),
  drawn by [scripts/mane-art.py](scripts/mane-art.py), which reads the sprite to find the
  middle of his head and where his chin ends, so the mane is refitted when he is redrawn
- The lion's sprites come from two sheets made with an image model. The seated cub is rebuilt
  by [scripts/todah-from-sheet.py](scripts/todah-from-sheet.py), which joins a clean face to a
  clean body, removes the JPEG smear, reduces him to ten colors, shaves everything outside
  his outline, and draws his tail. His blink, smile and talking faces, his four-frame walk and
  the three frames of his turn are cut from a second sheet
  ([docs/design/source/poses-sheet.jpg](docs/design/source/poses-sheet.jpg)) by
  [scripts/poses-from-sheet.py](scripts/poses-from-sheet.py), repainted in the same ten
  colors. The turn is no longer used in the intro: he stops on the last frame of his walk and
  fades into the seated cub. The first drawings are kept in
  [docs/design/source](docs/design/source)
- Most wardrobe pieces (jackets, bags, earrings, hats, glasses, scarves, chains, and the
  shishi transformation) are pictures cut from sheets the image model drew
  ([docs/design/source](docs/design/source)) by
  [scripts/wardrobe-from-sheet.py](scripts/wardrobe-from-sheet.py). It finds each cell's lion,
  keeps only what is not lion, and repaints every piece from one shared set of color ramps
  ([scripts/wardrobe_manifest.py](scripts/wardrobe_manifest.py)), so the same reds, blues,
  greens and blacks run through the whole wardrobe and any two pieces can be worn together
- A lioness's essentials are cut as they were drawn, at six times the lion's grid so their
  detail can be read, by [scripts/essentials-art.py](scripts/essentials-art.py). The shades
  are drawn onto the sprite's own eyes by [scripts/shades-art.py](scripts/shades-art.py)
- New wardrobe art is drawn by the image model over
  [docs/design/accessory-base.png](docs/design/accessory-base.png) with the prompts in
  [docs/design/nano-banana-prompts.md](docs/design/nano-banana-prompts.md)

## Demo video

To be added.
