import { describe, expect, it } from 'vitest';
import { buildStarterPetInput, shouldAutoCreateStarter } from '../starterPet';

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
});
