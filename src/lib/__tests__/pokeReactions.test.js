import { describe, expect, it } from 'vitest';
import {
  POKE_REACTION_COOLDOWN_MS,
  pickIdleEmote,
  pickPokeReaction
} from '../pokeReactions';

describe('poke reactions', () => {
  it('blocks reactions during cooldown', () => {
    const now = Date.parse('2026-03-10T09:00:00Z');
    expect(
      pickPokeReaction({
        now,
        lastReactionAt: now - POKE_REACTION_COOLDOWN_MS + 50,
        random: () => 0.2
      })
    ).toBeNull();
  });

  it('returns a standard reaction with sound cue and bubble text', () => {
    const reaction = pickPokeReaction({
      now: Date.parse('2026-03-10T09:00:00Z'),
      lastReactionAt: 0,
      random: () => 0.2
    });

    expect(reaction.id).toBe('smile');
    expect(reaction.soundCue).toBe('smile');
    expect(reaction.bubbleText).toBe('aww');
  });

  it('can return the rare sparkle reaction', () => {
    const reaction = pickPokeReaction({
      now: Date.parse('2026-03-10T09:00:00Z'),
      lastReactionAt: 0,
      random: () => 0.99
    });

    expect(reaction.id).toBe('sparkle');
  });

  it('picks idle emotes deterministically', () => {
    expect(pickIdleEmote(() => 0.01)).toBe('aww');
    expect(pickIdleEmote(() => 0.8)).toBe('boop');
  });
});
