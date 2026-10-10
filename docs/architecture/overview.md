# RWR architecture

Single Next.js (TypeScript, App Router) app. No separate backend service.

```mermaid
flowchart LR
  Browser[Browser: title, quest, upgrades, roar] -->|POST /api/todah| Route[Next.js server route]
  Route -->|primary| Groq[Groq API]
  Route -.->|only if GEMINI_FALLBACK=on| Gemini[Google Gemini API]
  Browser -->|guest progress| LocalStorage[(localStorage)]
  Browser -->|log in, sign up| SupabaseAuth[Supabase Auth]
  SupabaseAuth --- Postgres[(Supabase Postgres)]
  Browser -->|POST /api/suggest: a wardrobe idea| Suggest[Next.js server route]
  Suggest -->|SMTP, only if MAIL_USER is set| Mailbox[The maker's own mailbox]
  Browser -.->|only if the player presses SPEAK| Speech[The browser maker's speech service]
```

- LLM keys live only on the server (`.env.local` locally, host environment variables when deployed).
- The browser never calls an LLM directly.
- Wardrobe ideas: `/api/suggest` takes one line of text and whether the lion is a lion or a
  lioness, scrubs contact details, and emails it with Nodemailer from the mailbox named in
  `MAIL_USER` and `MAIL_PASS` (server only). It stores nothing. It is limited to three ideas
  per browser a day (cookie `rwr_idea`), six per network address an hour, and sixty a day per
  running server. With no mailbox set, `GET /api/suggest` answers `open: false` and the
  wardrobe hides the form.
- With no key set, or when both providers fail, the quest uses scripted lines from `lib/lines.ts`.
- The build log (`blog/`) is one static HTML file. `.github/workflows/blog.yml` publishes that
  folder to GitHub Pages whenever it changes on `main`. It shares nothing with the game at
  run time.

## Progression

- **Trail map** (`/map`, `lib/compass.ts`): each Ikigai circle is scored 0 to 3. The player
  writes a claim and ticks the evidence that is true of it; a claim with no evidence scores 0.
  The map shows the strongest and thinnest circle and one real-world step for the thinnest. It
  never ranks careers.
- **Level interviews** (`/level/heart`, `/level/craft`, `/level/cause`, `/level/coin`, `components/LevelQuest.tsx`): a scripted opener, then
  three follow-ups from `/api/todah` in `interview` mode. The server counts the answers, tells
  the model which follow-up it is on, and ends the level after the fourth answer. Each
  follow-up looks for one of the circle's three kinds of evidence (`levelBriefs` in
  `lib/prompts.ts`). A second call in `summary` mode returns a small JSON form, a claim and
  three true-or-false answers, which the server checks field by field. The player edits that
  form and only then is it saved to the trail map. If the AI is off, down, or returns
  anything unexpected, the level falls back to scripted questions and an empty form. All four
  levels share this one component: a level is its brief in `lib/prompts.ts` and its lines.
- **The quick round and the resting point**: of a level's three follow-ups, Todah asks two.
  The one between them (`LEVEL_TAP_AFTER` in `lib/levels.ts`) is the game's own question
  about the third kind of evidence, answered by tapping one of four sentences from
  `lib/lines.ts`, or by typing. It costs no AI call, and the sentence tapped goes into the
  talk as the player's answer. The prompt tells Todah the game asks about that, so he does
  not. A finished level says how many of the four are walked and offers REST HERE beside the
  next level.
- **Crossroads** (`/crossroads`, `components/CrossroadsScreen.tsx`): opens once every circle
  has a claim. One call in `crossroads` mode sends the four claims and their evidence counts
  and gets back a short message: what lines up, one gap, one open question. The prompt
  forbids naming careers or giving advice. The message is saved with the claims it was about,
  so it is asked for again only if they change. Then the player sets `goalText`, the goal the
  roar waits on. Without the AI the message is built from the strongest and thinnest circle.
  Before the goal, Todah says two things the diagram gets wrong if read too literally: the
  four circles do not all have to live in one job (in Pew's 2021 survey of 17 countries,
  family ranked above occupation as a source of meaning almost everywhere), and a thin circle
  is not a dead end (O'Keefe, Dweck and Walton, 2018: people who see interests as developed,
  not found, stay interested when a subject gets hard).
- **Three paths to test** (same screen): only if the player asks. `near` is one step up from
  where the player stands, `next` the same strengths somewhere else, and `wild` a bigger leap.
  The model does not name occupations or figures of its own. It chooses from the game's list:
  - `data/occupations.json` holds 756 occupations from the U.S. Bureau of Labor Statistics
    (Employment Projections 2025 to 2035, Table 1.2, joined to the May 2025 Occupational
    Employment and Wage Statistics by occupation code). `scripts/jobs-data.py` builds it with
    Python's standard library. BLS publishes both once a year, so that is how often it needs
    running. Lines with no yearly wage and the "all other" leftovers are dropped.
  - `poolFor` in `lib/occupations.ts` cuts the list to occupations whose median pay is at
    least $40,000 and, if the player said what they make now (`progress.payNow`,
    `lib/pay.ts`, optional), at least 90% of that. The amount is used on the server for this
    cut and is never sent to the model. If almost nothing pays that much, the 30 best-paid
    occupations are offered and each is marked `less`, so the card can say so.
  - A pool of more than 150 is too long to send whole on the free AI tier, so the model first
    picks up to five of the 22 occupation groups (`pathGroupsPrompt`, low reasoning effort),
    and then chooses among the occupations in them (`pathsPrompt`, medium effort: on low it
    reached for the nearest job title, not the step up).
  - The model returns three codes, each with one sentence of why and a goal. `readPaths` in
    the route accepts exactly one of each kind, each a different code that was on the list it
    was shown, and asks once more if the reply is anything else. The title, the pay (lower and
    upper quarter, and median), the education, experience and training, the projected growth
    and the yearly openings are all filled in from the data by `factsFor`.
  - The card says the figures are national, whose they are and what year, and that the
    outlook is a projection. It links to O*NET OnLine's search for the occupation, for pay in
    the player's area.
  Earlier the model named occupations and pay from memory. It invented jobs, got training
  wrong, and raised its pay figures when told the player earned more, which is why none of
  that is left to it. The answer is saved with the claims, scores and amount it was made
  from. Taking a path writes its goal to `goalText`. With the AI off or down the player gets
  three questions to find the paths themselves.
- **Todah's thoughts on the goal**: one call in `goal` mode whenever `goalText` changes, saved
  with the goal it was about. It is left out without the AI.
- **Trail Card** (`/card`, `components/TrailCardScreen.tsx`): a page drawn from the saved game,
  with no AI call: the lion as it is dressed, the four claims, the goal and the first step.
- **A letter to yourself** (`components/SealedLetter.tsx`): `progress.capsule` holds the text,
  when it was sealed, `opensAt` (a date, or `null` to wait for the goal) and when it was
  opened. `capsuleDue` in `lib/progress.ts` is the one test of whether it has arrived. It is
  never sent to the server.
- **Todah remembers**: in `interview` mode the browser also sends the claims already on the
  map from the other circles, the first Quest 1 answer (Heart only) and up to two friends'
  witness answers (Craft only). `readMemory` in the route scrubs and trims them, and
  `levelPrompt` asks Todah to pick up a thread on his first follow-up and in his closing
  words, and never to re-ask what he already knows. It costs no extra AI calls.
- **The road** (`/road`, `components/RoadScreen.tsx`): the player names an obstacle. One call
  in `road` mode returns JSON (an if-then plan and three experiments, each tied to a circle),
  checked field by field like the level summary, and the player edits it before it is saved
  as `progress.road`. If their words show distress the model returns `care: true` and the
  screen stops planning and responds with care. Doing an experiment opens a check-in: one
  call in `checkin` mode, one reply from Todah, then that circle's evidence boxes for the
  player to update. The first experiment done for a circle counts as that circle's trail
  step (2 Pride Power). The if-then plan follows research on mental contrasting with
  implementation intentions (Oettingen and Gollwitzer).
- **A friend's witness** (`/witness`, `lib/witness.ts`): built like My Pride. The question
  link carries the lion's card id, the player's first name and the lion's name. The answer
  link carries the card id, the friend's first name and up to 200 characters. Both sit in
  the URL fragment, every field is validated and run through the name filter, and an answer
  is kept only if its card id matches the lion in play. It is an honor system.
- **Todah's note** (`/letter`, `components/LetterScreen.tsx`, `lib/letterImage.ts`): opens
  only once `goalAchievedAt` is set. One call in `letter` mode sends the player's words in
  order (the first Quest 1 answer, the four claims, friends' witness answers, the goal, the
  obstacle and plan, and what they reported about each experiment) and gets back the middle of
  a note of about 90 words. The game adds the greeting and signature, so the player's name is
  never sent. The server then removes the quotation marks from any quote that is not really
  in the player's words, and asks once more if the note runs long. The model is asked to
  think only lightly for this call: asked to think harder it has used its whole allowance
  thinking and returned nothing. Without the AI the note is assembled from the player's own
  words. It is saved as `progress.letter` and can be rewritten twice.
  The note is drawn on a canvas in the browser: wood grain, paper fibres, fold creases and
  the inked paw print are made from seeded random strokes, the text is set in a handwriting
  font, and the lion is the player's own pixel lion (coat color worked out pixel by pixel
  with `lib/colour.ts`) enlarged eight times with the Scale2x edge-rounding method and given
  a soft-focus copy underneath. The same picture is what the screen shows and what is saved
  or shared, as a JPEG. The words are also in the image's alt text and offered as plain text.
- **Sharing the free AI** (`lib/limit.ts`): the provider's free tier is one daily budget for
  all players. Before each AI reply the route checks a daily count kept in an HttpOnly cookie
  (a date and a number, nothing about the visitor; 60 a day) and a per-minute count per
  network address held in memory (20 a minute). Past either, the route answers 429 and the
  game carries on from scripted lines. Clearing cookies resets the daily count: a limit that
  could not be reset would need a stored row per visitor, which the game chooses not to
  keep. Token counts per call are logged (numbers only) to watch the budget. A full
  playthrough is about 25 AI replies (3 in Quest 1, 4 in each of the four levels, two for the
  three paths, and one each for the Crossroads, the goal, the road and Todah's note), plus one per
  experiment reported.
- **The roar** (`/roar`, `components/RoarScreen.tsx`, `lib/roarSound.ts`): the goal is
  confirmed by pressing and holding for 1.5 seconds, with a plain press beside it for anyone
  who cannot hold. A small store says when the roar starts and ends, and `MusicPlayer` cuts
  the music in 0.15 seconds and brings it back quietly afterwards. The credits are the
  player's own trail. On the whole screen they are moved by the game itself each animation
  frame, so the scroll wheel can ease the pace, and they stop on a last screen sized to the
  window.
- **Lion upgrades** (`/upgrades`, `lib/upgrades.ts`): every slot has three checks, one per
  level, that look at what the entry says (a second sentence, a result with a number, proof in
  brackets) and not at its length.
- **Den** counts career paths: lions that have a main goal and at least 3 evidence points.
- **Pride** counts connections: friends in My Pride and outreach the player logs
  (self-reported). Levels need 3, 10 and 25. With no accounts this is an honor system.
- **Pride Power** runs to 50: 21 from the seven slots, 12 from trail map evidence, 10 from
  real-world trail steps (2 each), and 7 from one-off milestones (finish Quest 1, set a goal,
  write all four claims, send a cheer, and the roar, worth 3). `powerParts` in
  `lib/progress.ts` holds the sum.
- **Wardrobe** (`/wardrobe`, `lib/accessories.ts`): sparks come from levels walked (5 each),
  real-world steps done (3 each), cheers received (1 each, once per friend per day, only from
  someone in the pride) and interviews logged (25 each). They buy accessories, one worn per
  category, except a lioness's essentials: up to three stand on the floor by her paws, the
  third tucked behind them by drawing the paws again on top. A lion has a mane and its
  colors, a lioness an aura, essentials and bags. Guests can look but only a signed-in player
  can own or wear them, and the crown is a gift for the roar alone. `LionAvatar` draws the seated sprite and the
  accessories on one 51 by 64 grid, so they line up at any size. Fur colors are CSS filters
  over the sprite. The mane is its own layer (`lib/maneArt.ts`, generated to fit the sprite's
  outline) in four sizes: its size follows the Mane upgrade's level and its color is the one
  thing a purchase changes. Each accessory has color options, passed around as `id~colour`
  tokens, so a friend's card shows the same outfit.
- **Matching sets** (`lib/colour.ts`, `setMane` in `lib/accessories.ts`): every fur has a mane
  of the same name. Its two colors are the natural mane's colors put through that fur's
  filter (the same maths the browser uses), so each set repeats the golden cub's own scheme:
  the mane is the coat's color a step round the wheel, deeper and stronger. It also matches
  the tail tip the filter has already tinted on the sprite. Fur and mane are bought
  separately, so a new fur alone does not match until its mane is bought too. Three manes
  (white, purple, teal) belong to no set. The mane layer is drawn only from Mane level 1 up.
- **Picture pieces**: accessories marked `image` in `lib/accessories.ts` are PNGs in
  `public/wardrobe`, one per color (`<id>--<colour>.png`), the size of the lion's stage with
  only the piece on it. `LionAvatar` draws them as SVG images in `drawOrder` (a costume
  first, then jackets, what hangs over them, what sits on the face and head, and last what
  stands on the floor), mixed in with the older letter-drawn pieces. `scripts/wardrobe-from-sheet.py` makes
  them: it registers each sheet cell's lion against the game's sprite by outline, keeps the
  pixels whose color is not found there or next to it, and repaints the piece from the
  shared ramps in `scripts/wardrobe_manifest.py`, giving each pixel a ramp step by its rank
  from dark to light. One palette for every piece is what makes any combination sit together.
  A piece marked `alone` (the shishi transformation) is a whole picture: while it is on,
  it is all that is drawn. A lioness's essentials are cut by `scripts/essentials-art.py` as
  they were drawn, at six times the grid, and are not pixelated when shown.
- **Several lions**: NEW GAME sets the game in play aside (`rwr.lions.v1`) and starts another.

## Around every screen

- **The way back** (`lib/lastScreen.ts`, `components/LastScreen.tsx`,
  `components/SettingsToggles.tsx`): a back arrow and a home button sit in the corner of every
  screen but the title. The game keeps its own trail of screens in `sessionStorage`. The
  arrow goes to the one before, or to the screen above when there is none. Where the browser's
  Navigation API shows that same screen one step back in the same document, the arrow steps
  back through history, so the screen returns scrolled to where it was left. Otherwise it
  opens the screen as a link would, so it can never lead out of the game. ABOUT, PRIVACY and
  DEV have a BACK of their own that returns to the last screen of the game itself.
- **Speaking an answer** (`lib/speech.ts`, `components/MicButton.tsx`): SPEAK beside an answer
  box uses the browser's Web Speech API. RWR's server never receives sound. Most browsers send
  it to their maker's speech service, so the player is told and asked before the first use,
  and the answer is kept in settings. Words are added to what is in the box and corrected as
  the sentence takes shape. Typing in the box, or sending it, ends the listening. A store
  tells `MusicPlayer` to drop to silence while a mic is on. A browser without the API shows
  no button.
- **Sound needs a tap** (`lib/audioGate.ts`, `components/MusicPlayer.tsx`): browsers refuse
  to play sound until the player interacts. The title screen then starts switched off behind
  POWER ON. Sound counts as allowed only when a track that is meant to be heard is playing:
  Safari and Firefox let a track at volume 0 start with no tap, which proves nothing.
- **The old TV set** (`components/TvFrame.tsx`, `app/globals.css`): drawn in CSS on a screen
  wider than it is tall. Custom properties say how far its plastic reaches in from each edge
  (zero when it is off), and the page, the pinned buttons and the pop-up boxes all add them.
  The plastic carries on past the top and bottom edges, for phone browsers that show more
  page than they report when their own bars slide away. TV SET in SETTINGS is always there.

## Accounts

- `lib/account.ts` keeps one watcher on the Supabase session and feeds every screen.
- **Forgotten passwords**: "Forgot password?" in the login box (and CHANGE PASSWORD on
  `/privacy`) asks Supabase to email a reset link. The link logs the player in and Supabase
  reports a password recovery, and `AccountWatch` (in the layout) opens the new password box
  on whatever page they land. The reply is the same whether or not the email has an account.
  In the Supabase dashboard (Authentication, URL Configuration) the Site URL must be the live
  site, and the Redirect URLs must include the live site and `http://localhost:3000`.
- **Dev account**: an account marked `dev` in its app metadata gets a DEV chip and the dev
  tools at `/dev`. App metadata is set by the project owner in Supabase, and a player cannot
  set it on themselves. Dev tools are stored with the lion in play (`progress.dev`): unlock
  every accessory, choose the mane size, choose the form. They change looks and ownership only
  and never add to Pride Power. For guests, and on any account that is not a dev account,
  `AccountWatch` switches them off. Like the rest of the game's progress this is checked in
  the browser, so it guards against accidents, not against someone editing their own saved game.

## My Pride (friends without a backend)

```mermaid
sequenceDiagram
  participant A as Player A's browser
  participant B as Player B's browser
  A->>A: Pack card (name, lion, form, Pride Power, goal) into a link
  A-->>B: Link or QR code, sent by the players themselves
  B->>B: Unpack, check every field, run the name filter
  B->>B: Save A's card in localStorage
  B-->>A: Cheer link (a preset cheer plus B's latest card)
  A->>A: Show the cheer, refresh B's card
```

- The card sits after the `#` in the link, which browsers do not send to any server, so the
  RWR server never sees it. Nothing about friends is stored in the database.
- Cheers are a fixed list in `lib/lines.ts`, so a link cannot carry a custom message.
- Links are untrusted input: `lib/pride.ts` validates types and lengths and drops anything the
  name filter refuses.
- Trade-off: a friend's card is a snapshot. It refreshes when they share again or send a cheer.

## Privacy by design

- Todah asks for consent before the first AI call. Without it, the quest runs from scripted
  lines entirely in the browser.
- The player's name is never sent to the server. The AI writes a `[NAME]` token and the browser
  fills it in.
- Email addresses, links, and phone numbers are scrubbed from answers before they reach a provider
  (`lib/scrub.ts`).
- The server route does not log or store answers.
- The letter a player seals for themselves never leaves the device.
- Sound from the microphone never reaches RWR. The browser turns it into words, and the game
  says where the sound goes and asks before the mic is first used.
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
