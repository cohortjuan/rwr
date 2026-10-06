// Every canned (non-AI) line in RWR lives here so the wording can be edited in one place.
// Rules that must survive edits: Todah is a guide, not a prophet. He never says a job or
// outcome is promised, and he does not roar until the player confirms their goal is reached.

export type EntryChoice = 'starting' | 'changing' | 'stuck' | 'curious'

export const lines = {
  title: {
    name: 'RWR',
    subtitle: '16-BIT CAREER ADVENTURE',
    pressStart: 'PRESS START',
    skipHint: 'Press any key or click to skip',
    continuePrompt: 'CONTINUE?',
    continueYes: 'CONTINUE',
    continueNew: 'NEW GAME',
    newGameConfirm: 'Start over? This clears the progress saved in this browser.',
  },

  settings: {
    soundOn: 'SOUND: ON',
    soundOff: 'SOUND: OFF',
    motionOn: 'MOTION: ON',
    motionOff: 'MOTION: OFF',
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
      'Guest progress stays in this browser only. With an account, your email and your game progress are stored in our database so you can pick up on another device. Answers you type to Todah are sent to an AI service to write his replies, so please use made-up details while RWR is in testing.',
    notConfigured: 'Accounts are not switched on yet. Guest mode works right now.',
    signupCheckEmail: 'Almost there. Check your email for a confirmation link, then log in.',
    genericError: 'That did not work. Check your email and password and try again.',
  },

  onboarding: {
    questName: 'QUEST 1: THE LAY OF THE LAND',
    next: 'NEXT',
    completeBanner: 'QUEST COMPLETE',
    hello: "Hey, traveler! I'm Todah. I'm still a cub, but I know every trail out here.",
    questIntro: 'Quest 1: The Lay of the Land. No wrong answers, no timer.',
    startQuest: 'START QUEST',
    whatIsThis: 'WHAT IS THIS?',
    explain:
      'RWR is a short game for thinking about work. I ask about what you love, what you are good at, what the world needs, and what you can be paid for. Then we sketch a roadmap together. I am a guide, not a fortune teller, so nothing here is a promise about any job.',
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
    thinking: 'Todah is thinking...',
    answerLabel: 'Your answer',
    answerPlaceholder: 'Type your answer',
    send: 'SEND',
    complete: (name: string) =>
      `Quest 1 complete. Thank you for walking with me, ${name}. Level 1: Passion is the next trail, and it is still being built.`,
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
    network: 'I lost the trail for a second. Please try again.',
    emptyAnswer: 'Type something first. A few words are plenty.',
  },

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
    formCub: 'CUB',
    formNomad: 'NOMAD',
    formLeader: 'PRIDE LEADER',
    leaderLocked: 'PRIDE LEADER: LOCKED',
    leaderLockedBody:
      'Todah roars only when you say your main goal is reached. No one else gets to decide that.',
    toRoar: 'GO TO MY GOAL',
    back: 'BACK TO TITLE',
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
