import { describe, expect, it } from 'vitest';
import { hasSoundCue } from '../audio';

describe('audio cues', () => {
  it('includes launcher, pet, and poke sounds', () => {
    expect(hasSoundCue('profileSelect')).toBe(true);
    expect(hasSoundCue('profileCreate')).toBe(true);
    expect(hasSoundCue('petCreate')).toBe(true);
    expect(hasSoundCue('petName')).toBe(true);
    expect(hasSoundCue('laugh')).toBe(true);
    expect(hasSoundCue('sparkle')).toBe(true);
    expect(hasSoundCue('wake')).toBe(true);
  });
});
