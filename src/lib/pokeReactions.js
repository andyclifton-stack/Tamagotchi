export const POKE_REACTION_COOLDOWN_MS = 900;

export const POKE_REACTIONS = [
  {
    id: 'laugh',
    bubbleText: 'hehe',
    soundCue: 'laugh',
    animation: 'laugh',
    face: 'happy'
  },
  {
    id: 'smile',
    bubbleText: 'aww',
    soundCue: 'smile',
    animation: 'smile',
    face: 'happy'
  },
  {
    id: 'blush',
    bubbleText: 'oops',
    soundCue: 'blush',
    animation: 'blush',
    face: 'blush'
  },
  {
    id: 'shocked',
    bubbleText: 'wow',
    soundCue: 'shocked',
    animation: 'shocked',
    face: 'shocked'
  },
  {
    id: 'sleepy',
    bubbleText: 'zzz',
    soundCue: 'sleepy',
    animation: 'sleepy',
    face: 'sleep'
  },
  {
    id: 'proud',
    bubbleText: 'ta-da',
    soundCue: 'proud',
    animation: 'proud',
    face: 'happy'
  },
  {
    id: 'silly',
    bubbleText: 'boop',
    soundCue: 'silly',
    animation: 'silly',
    face: 'playful'
  },
  {
    id: 'sparkle',
    bubbleText: 'yay',
    soundCue: 'sparkle',
    animation: 'sparkle',
    face: 'happy',
    rare: true
  }
];

export const IDLE_EMOTES = ['aww', 'hi', 'wow', 'boop'];

export function pickPokeReaction({
  now = Date.now(),
  lastReactionAt = 0,
  random = Math.random
} = {}) {
  if (now - lastReactionAt < POKE_REACTION_COOLDOWN_MS) {
    return null;
  }

  const roll = Math.max(0, Math.min(0.999999, random()));
  const standardPool = POKE_REACTIONS.filter((reaction) => !reaction.rare);
  const rarePool = POKE_REACTIONS.filter((reaction) => reaction.rare);
  const rareThreshold = 0.94;
  const pool = roll >= rareThreshold ? rarePool : standardPool;
  const normalized = roll >= rareThreshold
    ? (roll - rareThreshold) / (1 - rareThreshold)
    : roll / rareThreshold;
  const index = Math.min(pool.length - 1, Math.floor(normalized * pool.length));
  const picked = pool[index];

  return {
    ...picked,
    at: now,
    cooldownUntil: now + POKE_REACTION_COOLDOWN_MS
  };
}

export function pickIdleEmote(random = Math.random) {
  const roll = Math.max(0, Math.min(0.999999, random()));
  return IDLE_EMOTES[Math.floor(roll * IDLE_EMOTES.length)];
}
