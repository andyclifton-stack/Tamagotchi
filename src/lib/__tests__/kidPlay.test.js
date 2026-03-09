import { describe, expect, it } from 'vitest';
import { ACTION_TYPES } from '../../config/appConfig';
import {
  deriveKidNeeds,
  mapKidActionToEngineActions,
  shouldShowMedicine
} from '../kidPlay';

function makePet(overrides = {}) {
  return {
    stats: {
      hunger: 70,
      happiness: 60,
      affection: 80,
      energy: 50,
      hygiene: 90,
      health: 95,
      messCount: 1
    },
    status: {
      isSick: false
    },
    ...overrides,
    stats: {
      hunger: 70,
      happiness: 60,
      affection: 80,
      energy: 50,
      hygiene: 90,
      health: 95,
      messCount: 1,
      ...(overrides.stats || {})
    },
    status: {
      isSick: false,
      ...(overrides.status || {})
    }
  };
}

describe('kid play helpers', () => {
  it('maps kid actions to engine actions', () => {
    const petWithMess = makePet({ stats: { messCount: 2 } });
    const cleanMess = mapKidActionToEngineActions('clean', petWithMess);
    expect(cleanMess).toEqual([{ type: ACTION_TYPES.TOILET }]);

    const cleanWash = mapKidActionToEngineActions('clean', makePet({ stats: { messCount: 0 } }));
    expect(cleanWash).toEqual([{ type: ACTION_TYPES.CLEAN_WASH }]);

    expect(mapKidActionToEngineActions('feed', makePet())).toEqual([
      { type: ACTION_TYPES.FEED_MEAL }
    ]);
    expect(mapKidActionToEngineActions('play', makePet())).toEqual([
      { type: ACTION_TYPES.COMFORT }
    ]);
    expect(mapKidActionToEngineActions('medicine', makePet())).toEqual([
      { type: ACTION_TYPES.GIVE_MEDICINE }
    ]);

    expect(mapKidActionToEngineActions('sleep', makePet())).toEqual([
      { type: ACTION_TYPES.TOGGLE_LIGHTS, payload: { lightsOff: true } },
      { type: ACTION_TYPES.REST }
    ]);
  });

  it('derives kid-facing needs from existing stat model', () => {
    const needs = deriveKidNeeds(
      makePet({
        stats: {
          hunger: 31,
          happiness: 48,
          affection: 72,
          energy: 44,
          hygiene: 80,
          messCount: 2
        }
      })
    );

    expect(needs.hunger).toBe(31);
    expect(needs.happy).toBe(60);
    expect(needs.energy).toBe(44);
    expect(needs.clean).toBe(32);
  });

  it('shows medicine when pet is sick or unhealthy', () => {
    expect(shouldShowMedicine(makePet())).toBe(false);
    expect(shouldShowMedicine(makePet({ status: { isSick: true } }))).toBe(true);
    expect(shouldShowMedicine(makePet({ stats: { health: 40 } }))).toBe(true);
  });
});
