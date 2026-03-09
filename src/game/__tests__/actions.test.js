import { describe, expect, it } from 'vitest';
import { ACTION_TYPES } from '../../config/appConfig';
import { applyPetAction } from '../actions';

function makePet(overrides = {}) {
  const now = Date.parse('2026-03-09T10:00:00Z');
  const base = {
    id: 'pet-1',
    ownerUid: 'owner-1',
    name: 'Buddy',
    nameKey: 'buddy',
    speciesId: 'mochi',
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    lastSimulatedAt: now,
    stageStartedAt: now,
    hatchedAt: null,
    currentStage: 'egg',
    evolutionBranch: null,
    currentMood: 'content',
    theme: 'soft3d',
    liveForeverMode: true,
    pinEnabled: false,
    pinHash: '',
    pinSalt: '',
    status: {
      isSleeping: false,
      isSick: false,
      lightsOff: false,
      careCenterRest: false,
      illnessPressure: 0,
      asleepUntil: null
    },
    stats: {
      hunger: 50,
      happiness: 50,
      energy: 60,
      hygiene: 60,
      health: 70,
      toilet: 10,
      affection: 50,
      discipline: 50,
      messCount: 0
    },
    growth: {
      careMoments: 0,
      neglectMoments: 0,
      snackOveruseCount: 0,
      disciplineUses: 0,
      illnessRecoveries: 0,
      rescueCount: 0,
      stageHistory: [{ stage: 'egg', at: now }]
    },
    share: {
      shareToken: null,
      shareEnabled: false,
      sharedAt: null
    },
    sceneSeed: 1234,
    archived: false,
    version: 1
  };

  return {
    ...base,
    ...overrides,
    status: { ...base.status, ...(overrides.status || {}) },
    stats: { ...base.stats, ...(overrides.stats || {}) },
    growth: { ...base.growth, ...(overrides.growth || {}) },
    share: { ...base.share, ...(overrides.share || {}) }
  };
}

describe('applyPetAction egg handling', () => {
  it('allows meal action while still in egg stage', () => {
    const pet = makePet();
    const now = Date.parse('2026-03-09T10:01:00Z');
    const result = applyPetAction(pet, { type: ACTION_TYPES.FEED_MEAL }, now);
    expect(result.events.some((event) => event.type === 'feed')).toBe(true);
    expect(result.events.some((event) => event.type === 'blocked')).toBe(false);
  });

  it('allows sleep action while still in egg stage', () => {
    const pet = makePet();
    const now = Date.parse('2026-03-09T10:01:00Z');
    const result = applyPetAction(pet, { type: ACTION_TYPES.REST }, now);
    expect(result.events.some((event) => event.type === 'rest')).toBe(true);
    expect(result.events.some((event) => event.type === 'blocked')).toBe(false);
  });
});
