import { describe, expect, it } from 'vitest';
import { createPetFromSnapshot } from '../createPet';

describe('createPetFromSnapshot', () => {
  it('keeps the pet timeline when recreating from local cache', () => {
    const createdAt = Date.parse('2026-03-09T19:00:00Z');
    const snapshot = {
      id: 'old-pet',
      ownerUid: 'old-owner',
      name: 'Buddy',
      speciesId: 'mochi',
      createdAt,
      updatedAt: createdAt,
      lastPlayedAt: createdAt,
      lastSimulatedAt: createdAt + 5 * 60 * 1000,
      currentStage: 'egg',
      status: { isSleeping: false, lightsOff: false },
      stats: { hunger: 82 },
      share: { shareToken: 'share-me', shareEnabled: true, sharedAt: createdAt },
      archived: true
    };

    const recreatedAt = Date.parse('2026-03-09T19:10:00Z');
    const restored = createPetFromSnapshot(snapshot, 'owner-2', recreatedAt);

    expect(restored.id).not.toBe(snapshot.id);
    expect(restored.ownerUid).toBe('owner-2');
    expect(restored.createdAt).toBe(createdAt);
    expect(restored.lastSimulatedAt).toBe(snapshot.lastSimulatedAt);
    expect(restored.share.shareEnabled).toBe(false);
    expect(restored.share.shareToken).toBeNull();
    expect(restored.archived).toBe(false);
  });
});
