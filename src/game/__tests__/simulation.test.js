import { describe, expect, it } from 'vitest';
import { simulatePetState } from '../simulation';

function makePet(overrides = {}) {
  const base = {
    id: 'pet-1',
    ownerUid: 'owner-1',
    name: 'Pebble',
    nameKey: 'pebble',
    speciesId: 'pebble',
    createdAt: Date.parse('2026-03-09T10:00:00Z'),
    updatedAt: Date.parse('2026-03-09T10:00:00Z'),
    lastPlayedAt: Date.parse('2026-03-09T10:00:00Z'),
    lastSimulatedAt: Date.parse('2026-03-09T10:00:00Z'),
    stageStartedAt: Date.parse('2026-03-09T10:00:00Z'),
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
      hunger: 82,
      happiness: 78,
      energy: 88,
      hygiene: 82,
      health: 92,
      toilet: 12,
      affection: 80,
      discipline: 62,
      messCount: 0
    },
    growth: {
      careMoments: 0,
      neglectMoments: 0,
      snackOveruseCount: 0,
      disciplineUses: 0,
      illnessRecoveries: 0,
      rescueCount: 0,
      stageHistory: [{ stage: 'egg', at: Date.parse('2026-03-09T10:00:00Z') }]
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

describe('simulatePetState', () => {
  it('hatches an egg after 15 minutes', () => {
    const pet = makePet();
    const result = simulatePetState(pet, Date.parse('2026-03-09T10:16:00Z'));

    expect(result.pet.currentStage).toBe('baby');
    expect(result.events.some((event) => event.type === 'hatch')).toBe(true);
  });

  it('softens overnight decay while sleeping', () => {
    const nightPet = makePet({
      currentStage: 'child',
      hatchedAt: Date.parse('2026-03-09T10:15:00Z'),
      lastSimulatedAt: Date.parse('2026-03-09T22:00:00Z'),
      status: {
        lightsOff: true,
        asleepUntil: Date.parse('2026-03-10T07:00:00Z')
      }
    });

    const dayPet = makePet({
      currentStage: 'child',
      hatchedAt: Date.parse('2026-03-09T10:15:00Z'),
      lastSimulatedAt: Date.parse('2026-03-09T10:00:00Z')
    });

    const overnight = simulatePetState(nightPet, Date.parse('2026-03-10T06:00:00Z'));
    const daytime = simulatePetState(dayPet, Date.parse('2026-03-09T18:00:00Z'));

    expect(overnight.pet.stats.hunger).toBeGreaterThan(daytime.pet.stats.hunger);
  });

  it('prevents terminal state in live forever mode', () => {
    const pet = makePet({
      currentStage: 'adult',
      hatchedAt: Date.parse('2026-03-09T10:15:00Z'),
      liveForeverMode: true,
      stats: {
        hunger: 2,
        energy: 2,
        hygiene: 2,
        health: 2,
        messCount: 3
      }
    });

    const result = simulatePetState(pet, Date.parse('2026-03-09T12:30:00Z'));
    expect(result.pet.status.careCenterRest).toBe(false);
  });

  it('can enter Care Center Rest when live forever is off and neglect is severe', () => {
    const pet = makePet({
      currentStage: 'adult',
      hatchedAt: Date.parse('2026-03-09T10:15:00Z'),
      liveForeverMode: false,
      stats: {
        hunger: 2,
        energy: 2,
        hygiene: 2,
        health: 2,
        messCount: 3
      }
    });

    const result = simulatePetState(pet, Date.parse('2026-03-09T12:30:00Z'));
    expect(result.pet.status.careCenterRest).toBe(true);
  });
});
