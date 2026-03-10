import { describe, expect, it } from 'vitest';
import {
  buildPetAccessKey,
  buildPetAccessRecord,
  toPetAccessSummary,
  unlockPetAccess,
  unlockPetAdminAccess
} from '../petAccess';

function createPet(overrides = {}) {
  return {
    id: 'pet-1',
    ownerUid: 'owner-1',
    name: 'Buddy',
    speciesId: 'mochi',
    profileId: 'kid-1',
    profileName: 'Andy',
    profileAvatarId: 'rocket',
    currentStage: 'baby',
    currentMood: 'happy',
    theme: 'soft3d',
    pinEnabled: true,
    updatedAt: 123,
    lastPlayedAt: 120,
    sceneSeed: 44,
    status: {
      isSleeping: false,
      isSick: false,
      careCenterRest: false
    },
    stats: {
      messCount: 1
    },
    ...overrides
  };
}

describe('pet access records', () => {
  it('builds a stable access key and summary', async () => {
    const record = await buildPetAccessRecord(createPet(), {
      refreshToken: 'refresh-token',
      petPin: '1234',
      parentPin: '2468'
    });

    expect(buildPetAccessKey('pet-1')).toBe('pet_pet-1');
    expect(record.accessKey).toBe('pet_pet-1');
    expect(toPetAccessSummary(record)).toMatchObject({
      petId: 'pet-1',
      ownerUid: 'owner-1',
      name: 'Buddy',
      profileName: 'Andy'
    });
  });

  it('unlocks with the pet pin and rejects the wrong one', async () => {
    const record = await buildPetAccessRecord(createPet(), {
      refreshToken: 'refresh-token',
      petPin: '1234'
    });

    const unlocked = await unlockPetAccess(record, '1234');
    const rejected = await unlockPetAccess(record, '9999');

    expect(unlocked).toMatchObject({
      petId: 'pet-1',
      ownerUid: 'owner-1',
      refreshToken: 'refresh-token',
      petPin: '1234'
    });
    expect(rejected).toBe(null);
  });

  it('supports parent override when an admin vault exists', async () => {
    const record = await buildPetAccessRecord(createPet(), {
      refreshToken: 'refresh-token',
      petPin: '1234',
      parentPin: '2468'
    });

    const unlocked = await unlockPetAdminAccess(record, '2468');
    const rejected = await unlockPetAdminAccess(record, '1357');

    expect(unlocked).toMatchObject({
      petId: 'pet-1',
      ownerUid: 'owner-1',
      refreshToken: 'refresh-token',
      parentPin: '2468'
    });
    expect(rejected).toBe(null);
  });
});
