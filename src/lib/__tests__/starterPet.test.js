import { describe, expect, it } from 'vitest';
import {
  buildStarterPetInput,
  hasReusablePetSnapshot,
  shouldAutoCreateStarter
} from '../starterPet';

describe('starter pet helpers', () => {
  it('returns the expected starter pet payload', () => {
    expect(buildStarterPetInput()).toEqual({
      name: 'Buddy',
      speciesId: 'mochi',
      theme: 'soft3d',
      liveForeverMode: true,
      pin: ''
    });
  });

  it('creates starter pet only when boot and data are ready with no saved pets', () => {
    expect(
      shouldAutoCreateStarter({
        booting: false,
        ownerUid: 'owner-1',
        petListLoading: false,
        petCount: 0,
        starterCreated: false
      })
    ).toBe(true);

    expect(
      shouldAutoCreateStarter({
        booting: true,
        ownerUid: 'owner-1',
        petListLoading: false,
        petCount: 0,
        starterCreated: false
      })
    ).toBe(false);

    expect(
      shouldAutoCreateStarter({
        booting: false,
        ownerUid: 'owner-1',
        petListLoading: false,
        petCount: 2,
        starterCreated: false
      })
    ).toBe(false);

    expect(
      shouldAutoCreateStarter({
        booting: false,
        ownerUid: 'owner-1',
        petListLoading: false,
        petCount: 0,
        starterCreated: true
      })
    ).toBe(false);
  });

  it('accepts only complete cached pet snapshots for restore', () => {
    expect(
      hasReusablePetSnapshot({
        name: 'Buddy',
        speciesId: 'mochi',
        createdAt: Date.parse('2026-03-09T19:00:00Z'),
        stats: { hunger: 60 },
        status: { isSleeping: false }
      })
    ).toBe(true);

    expect(
      hasReusablePetSnapshot({
        name: 'Buddy',
        speciesId: 'mochi',
        createdAt: 'bad',
        stats: { hunger: 60 },
        status: { isSleeping: false }
      })
    ).toBe(false);
  });
});
