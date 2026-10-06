import { levels } from '@/lib/levels'

// Every canned (non-AI) line in RWR lives here so the wording can be edited in one place.
// Rules that must survive edits: Todah is a guide, not a prophet. He never says a job or
// outcome is promised, and he does not roar until the player confirms their goal is reached.

export type EntryChoice = 'starting' | 'changing' | 'stuck' | 'curious'

export const lines = {
  title: {
    name: 'RWR',
    subtitle: '16-BIT CAREER ADVENTURE',
    powerOn: 'POWER ON',
    powerOnHint: 'Tap, click, or press any key',
    pressStart: 'PRESS START',
    skipHint: 'Tap or press any key to skip',
    continuePrompt: 'CONTINUE?',
    continueYes: 'CONTINUE',
    continueNew: 'NEW GAME',
    continueLions: 'MY LIONS',
    newGameConfirm: (lion: string) =>
      `Start fresh with a new lion? ${lion} is kept safe under MY LIONS, and you can come back any time.`,
    newGameYes: 'YES, START FRESH',
    newGameNo: 'KEEP PLAYING',
  },

  // Naming the lion for a new game, and the list of lions set aside from earlier games.
  lions: {
    nameQuestion: 'Do you want to rename your new lion?',
    nameLabel: "New lion's name",
    nameUse: 'USE THIS NAME',
    nameKeep: (lion: string) => `KEEP ${lion.toUpperCase()}`,
    nameCancel: 'CANCEL',
    listHeading: 'MY LIONS',
    listIntro: 'Each lion keeps its own trail. Pick one to carry on with it. The one you are playing now is kept too.',
    summary: (form: string, power: number, max: number) => `${form} · PRIDE POWER ${power}/${max}`,
    walkingWith: (player: string) => `Walking with ${player}`,
    goal: 'Main goal:',
    play: 'PLAY',
    close: 'CLOSE',
  },

  account: {
    signedInAs: (email: string) => `Signed in as ${email}`,
    logOut: 'LOG OUT',
  },

  settings: {
    soundOn: 'SOUND: ON',
    soundOff: 'SOUND: OFF',
    motionOn: 'MOTION: ON',
    motionOff: 'MOTION: OFF',
    toNight: 'Switch to night mode',
    toDay: 'Switch to day mode',
  },

  login: {
    heading: 'WHO GOES THERE?',
    tabLogin: 'LOG IN',
    tabSignup: 'SIGN UP',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters.',
    submitLogin: 'LOG IN',
    submitSignup: 'CREATE ACCOUNT',
    guest: 'PLAY AS GUEST',
    close: 'CLOSE',
    working: 'One moment...',
    privacy:
      'Your game is saved in this browser only. An account stores your email with our login provider. Todah asks before any answer is sent to an AI service, and you can delete everything at any time.',
    privacyLink: 'How RWR handles your data',
    notConfigured: 'Accounts are not switched on yet. Guest mode works right now.',
    signupCheckEmail: 'Almost there. Check your email for a confirmation link, then log in.',
    genericError: 'That did not work. Check your email and password and try again.',
  },

  onboarding: {
    questName: 'QUEST 1: THE LAY OF THE LAND',
    next: 'NEXT',
    completeBanner: 'QUEST COMPLETE',
    hello: "Hey, traveler! I'm Todah. I'm still a cub, but I know every trail out here.",
    // Shown to every player before the first quest.
    ikigaiBrief:
      'This trail follows Ikigai, a Japanese idea of what makes life feel worth living. For work, it sits where four things meet: what you love (Heart), what you are good at (Craft), what the world needs (Cause), and what you can be paid for (Coin).',
    ikigaiGotIt: 'GOT IT',
    ikigaiMore: 'TELL ME MORE',
    // The optional deeper explanation, one page per entry.
    ikigaiDeep: [
      'Ikigai (say ee-kee-guy) joins two Japanese words: iki, life, and gai, worth. In Japan it can be anything that makes a day worth getting up for, big or small. A craft, a garden, a grandchild.',
      'The four-circle picture is a newer, Western way to draw it for careers. Where two circles overlap you get a name: love plus skill is Passion, love plus need is Mission, need plus pay is Vocation, skill plus pay is Profession.',
      'Miss a circle and something feels off. Paid and skilled but not in love? Comfortable, yet empty. Loving it but unpaid? Joyful, yet broke. The middle, where all four meet, is the sweet spot people call Ikigai.',
      `Nobody lands in the middle in one step, and that is fine. We will walk one circle at a time: ${levels.map((level) => level.name).join(', ')}. We look for honest evidence instead of perfect answers. I am a guide, not a fortune teller, so nothing here is a promise about any job.`,
    ],
    ikigaiNextPage: 'NEXT',
    ikigaiDone: 'READY',
    ikigaiSkip: 'SKIP',
    questIntro: 'Quest 1: The Lay of the Land. No wrong answers, no timer.',
    startQuest: 'START QUEST',
    whatIsThis: 'WHAT IS THIS?',
    explain:
      'RWR is a short game for thinking about work. We walk the four circles of Ikigai one at a time, then sketch a roadmap together. I am a guide, not a fortune teller, so nothing here is a promise about any job.',
    explainContinue: 'GOT IT, START QUEST',
    askName: 'What should I call you?',
    nameLabel: 'Your name or nickname',
    namePlaceholder: 'Type a name',
    nameSubmit: 'OK',
    askEntry: (name: string) => `Good to meet you, ${name}. What brought you out here today?`,
    entryChoices: [
      { id: 'starting', label: 'Just starting out' },
      { id: 'changing', label: 'Changing careers' },
      { id: 'stuck', label: 'Feeling stuck' },
      { id: 'curious', label: 'Just curious' },
    ] as { id: EntryChoice, label: string }[],
    reactions: {
      starting: 'A fresh trail. Good. We get to look at everything with new eyes.',
      changing: 'Changing direction takes nerve. We will map where you have been before we pick a new path.',
      stuck: "Stuck is a real place on the map. We'll explore it together.",
      curious: 'Curious is the best reason there is. Let us wander a little and see what turns up.',
    } as Record<EntryChoice, string>,
    reactionContinue: 'KEEP GOING',
    consent:
      'Quick heads-up: to answer in my own words, I send what you type to an AI helper. Your name stays with me. Skip anything private, or pick trail notes and nothing leaves this device.',
    consentYes: 'USE AI REPLIES',
    consentNo: 'USE TRAIL NOTES ONLY',
    consentMore: 'PRIVACY DETAILS',
    thinking: 'Todah is thinking...',
    answerLabel: 'Your answer',
    answerPlaceholder: 'Type your answer',
    send: 'SEND',
    complete: (name: string) =>
      `Quest 1 complete. Thank you for walking with me, ${name}. Level ${levels[0].number}: ${levels[0].name}, ${levels[0].circle}, is the next trail, and it is still being built.`,
    toUpgrades: 'SEE LION UPGRADES',
    toTitle: 'BACK TO TITLE',
  },

  // Used when no AI key is set, when the AI is unreachable, and in demo mode.
  // Same shape as the live quest: one warm-up question, then two follow-ups.
  scriptedFollowUps: [
    'Tell me about a recent day that felt good. What were you doing?',
    'Thanks for sharing that. What was it about that day that pulled you in?',
    'I hear you. If you could have one more hour of that day, which part would you pick?',
  ],

  errors: {
    aiUnavailable: 'My voice is a little faint right now, so I will stick to my trail notes.',
    aiCap: 'We have talked a lot this session. Let us rest here and pick the trail back up later.',
    emptyAnswer: 'Type something first. A few words are plenty.',
    nameBlocked: 'That name is not welcome on this trail. Please pick another one.',
  },

  privacy: {
    heading: 'YOUR DATA',
    intro: 'Some answers in RWR are personal. Here is exactly where they go, and how to remove them.',
    points: [
      { title: 'On this device', body: 'Your name, answers, upgrades, and goal are saved in this browser so you can come back, for the lion you are playing and any you have kept. Anyone who uses this browser profile could open them. Turn saving off below on a shared computer.' },
      { title: 'AI replies', body: 'If you choose AI replies, the answers you type are sent to an AI service to write what Todah says. Your name is not sent, and email addresses, links, and phone numbers are removed first. RWR does not log or store your answers on its server.' },
      { title: 'My Pride', body: 'Your pride card holds your first name, your lion, Pride Power, and your main goal if you leave that switched on. It travels inside the link or QR code you share. RWR does not store it and its server never sees it, but anyone who has the link can read it, so share it only with people you trust.' },
      { title: 'Accounts', body: 'If you sign up, your email is stored by our login provider. Your answers are not stored in our database. Deleting your data below removes the account too.' },
      { title: 'What RWR never does', body: 'No ads, no trackers, and no selling or sharing of your data.' },
    ],
    saveOn: 'SAVE ON THIS DEVICE: ON',
    saveOff: 'SAVE ON THIS DEVICE: OFF',
    saveOffNote: 'Saving is off. Your game lasts until you close or reload this tab.',
    aiOn: 'AI REPLIES: ON',
    aiOff: 'AI REPLIES: OFF',
    tipsOn: 'TIPS: ON',
    tipsOff: 'TIPS: OFF',
    deleteButton: 'DELETE MY DATA',
    deleteConfirm: 'Delete your game and every kept lion from this device? If you are signed in, your account is deleted too. This cannot be undone.',
    deleteYes: 'YES, DELETE IT',
    deleteNo: 'KEEP MY DATA',
    deleted: 'Done. Your game data is gone from this device.',
    deletedAccount: 'Done. Your game data is gone from this device and your account is deleted.',
    deleteFailed: 'Your device copy is deleted, but the account could not be reached. Please try again.',
    back: 'BACK TO TITLE',
    link: 'PRIVACY',
  },

  // For the Talk to Todah help chat (not built yet).
  help: {
    menuHeading: 'TALK TO TODAH',
    menu: [
      "I'm stuck on a question",
      'Explain Ikigai to me',
      'Help me think through a career idea',
      'Help with my roadmap',
      'Just talk',
    ],
  },

  upgrades: {
    heading: 'LION UPGRADES',
    intro: 'Each part of Todah grows when you fill in the matching part of your resume.',
    locked: 'COMING SOON',
    empty: 'EMPTY',
    level: (n: number, max: number) => `LEVEL ${n}/${max}`,
    save: 'SAVE',
    cancel: 'CANCEL',
    askTodah: 'ASK TODAH TO PHRASE THIS',
    suggestionsHeading: 'Starting points you can edit:',
    levelUp: 'LEVEL UP!',
    todahLabel: (form: string) => `TODAH: ${form}`,
    power: (n: number, max: number) => `PRIDE POWER ${n}/${max}`,
    formCub: 'CUB',
    formNomad: 'NOMAD',
    formLeader: 'PRIDE LEADER',
    leaderLocked: 'PRIDE LEADER: LOCKED',
    leaderLockedBody:
      'Todah roars only when you say your main goal is reached. No one else gets to decide that.',
    toRoar: 'GO TO MY GOAL',
    back: 'BACK TO TITLE',
    // Helpful tips on the upgrades screen. One shows per visit, the first that fits the game
    // so far (see pickTip in UpgradesScreen). Players can switch them off, and back on under
    // PRIVACY.
    tipLabel: 'TIP',
    tipGotIt: 'GOT IT',
    tipTurnOff: 'TURN TIPS OFF',
    tips: {
      start: 'Tap MANE to begin. One sentence about who you are at work earns the first level.',
      quest: 'Todah stays a cub until Quest 1 is finished. You can pick it up from the title screen.',
      nomad: 'Start two parts and Todah grows from Cub to Nomad.',
      levels: 'Every part has three levels. Open one to see what the next level needs.',
      phrase: 'Stuck on wording? Open a part and tap ASK TODAH TO PHRASE THIS for starting points you can edit.',
      unpaid: 'Unpaid and volunteer work counts under PAWS. So does caring for family.',
      pride: 'PRIDE grows when friends join. Open it to share your card by QR code or link.',
      goal: 'Set your main goal under GO TO MY GOAL. Only you decide when it is reached.',
      device: 'Everything here is saved in this browser only. On a shared computer, PRIVACY has a switch to turn saving off.',
    },
  },

  // My Pride: friends added by QR code or link, with preset cheers. Nothing here may promise
  // an outcome, and cheers stay preset so no one can send a hurtful message.
  pride: {
    heading: 'MY PRIDE',
    intro: 'Walk with friends. Swap cards by QR code or link, follow how their lions grow, and send a cheer.',
    noName: 'A traveler',
    slot: (level: number, max: number) => `PRIDE: LEVEL ${level}/${max}`,
    slotNext: (needed: number) => (needed === 1 ? 'One more friend takes it to the next level.' : `${needed} more friends take it to the next level.`),
    slotFull: 'Your pride is at full strength.',

    cardHeading: 'MY CARD',
    cardIntro: 'This is everything a friend sees. Nothing else you typed is shared.',
    cardWith: (name: string, lion: string) => `${name} and ${lion}`,
    power: (n: number, max: number) => `PRIDE POWER ${n}/${max}`,
    goal: 'Main goal:',
    goalReached: 'GOAL REACHED',
    goalOn: 'SHARE MY GOAL: ON',
    goalOff: 'SHARE MY GOAL: OFF',
    qrAlt: 'QR code for your pride card',
    qrHint: 'A friend points their phone camera at this code, or you send them the link.',
    copy: 'COPY MY LINK',
    share: 'SHARE',
    shareTitle: 'Join my pride on RWR',
    copied: 'Link copied. Send it to a friend.',
    copyFailed: 'Copying did not work here. Select the link below and copy it by hand.',

    addHeading: 'ADD A FRIEND',
    addIntro: "Scan a friend's code with your phone camera, or paste their link here.",
    addLabel: "Friend's link",
    addPlaceholder: 'Paste a pride link',
    addButton: 'ADD',
    addBad: 'That does not look like a pride link. Ask your friend to send it again.',
    addOwn: 'That is your own card.',
    addFull: 'Your pride is full. Say goodbye to a friend to make room.',

    incoming: (name: string, lion: string) => `${name} and their lion ${lion} want to join your pride.`,
    incomingYes: 'ADD TO MY PRIDE',
    incomingNo: 'NOT NOW',
    added: (name: string) => `${name} joined your pride.`,
    updated: (name: string) => `${name}'s card is up to date.`,
    cheerFrom: (name: string) => `${name} sent you a cheer:`,
    cheerClose: 'THANKS',

    friendsHeading: 'MY FRIENDS',
    friendsEmpty: 'No friends here yet. Share your card to start your pride.',
    asOf: (date: string) => `As of ${date}`,
    refreshHint: 'Cards refresh when a friend shares their link again or sends a cheer.',
    cheerButton: 'SEND A CHEER',
    cheerPick: (name: string) => `Pick a cheer for ${name}:`,
    cheerCancel: 'CANCEL',
    cheerCopied: (name: string) => `Cheer link copied. Send it to ${name}.`,
    cheerShareTitle: 'A cheer from RWR',
    remove: 'SAY GOODBYE',
    removeConfirm: (name: string) => `Remove ${name} from your pride? You can add them again with their link.`,
    removeYes: 'YES, REMOVE',
    removeNo: 'KEEP',
    cheers: {
      going: 'Keep going. I see the work you are putting in.',
      proud: 'Proud of you.',
      step: 'One small step today is enough.',
      back: 'I have your back on this trail.',
      rest: 'Rest counts too. Pick it back up tomorrow.',
    },

    receivedHeading: 'CHEERS FOR ME',
    receivedEmpty: 'Cheers from friends will show up here.',
    back: 'BACK TO UPGRADES',
  },

  roar: {
    heading: 'THE ROAR',
    noGoal: 'You have not set a main goal yet. What are you working toward?',
    goalLabel: 'My main goal',
    goalPlaceholder: 'For example: land my first design role',
    goalSave: 'SET GOAL',
    goalShown: 'Your main goal:',
    reachedQuestion: 'GOAL REACHED?',
    confirm: 'Are you ready to let Todah roar?',
    confirmYes: 'YES, LET HIM ROAR',
    confirmNo: 'NOT YET',
    rewardTitle: 'PRIDE LEADER',
    rewardBody: (name: string) =>
      name ? `You did this, ${name}. I only walked beside you.` : 'You did this. I only walked beside you.',
    replay: 'HEAR THE ROAR AGAIN',
    changeGoal: 'CHANGE GOAL',
    back: 'BACK TO UPGRADES',
    rewardAlt: 'Todah as a grown lion, roaring over a city skyline at sunset',
  },
}
