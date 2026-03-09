import { ACTION_TYPES } from '../config/appConfig';

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function deriveKidNeeds(pet) {
  if (!pet) {
    return {
      hunger: 0,
      happy: 0,
      energy: 0,
      clean: 0
    };
  }

  const stats = pet.stats || pet.statsPreview || {};
  const cleanPenalty = clamp((stats.messCount || 0) * 24, 0, 72);
  const clean = clamp((stats.hygiene || 0) - cleanPenalty);
  const happyBase =
    ((stats.happiness || 0) + (stats.affection || 0)) / 2;

  return {
    hunger: clamp(stats.hunger || 0),
    happy: clamp(happyBase),
    energy: clamp(stats.energy || 0),
    clean
  };
}

export function mapKidActionToEngineActions(actionId, pet) {
  if (actionId === 'feed') {
    return [{ type: ACTION_TYPES.FEED_MEAL }];
  }
  if (actionId === 'play') {
    return [{ type: ACTION_TYPES.COMFORT }];
  }
  if (actionId === 'clean') {
    if ((pet?.stats?.messCount || 0) > 0) {
      return [{ type: ACTION_TYPES.TOILET }];
    }
    return [{ type: ACTION_TYPES.CLEAN_WASH }];
  }
  if (actionId === 'sleep') {
    return [
      {
        type: ACTION_TYPES.TOGGLE_LIGHTS,
        payload: { lightsOff: true }
      },
      { type: ACTION_TYPES.REST }
    ];
  }
  if (actionId === 'medicine') {
    return [{ type: ACTION_TYPES.GIVE_MEDICINE }];
  }
  return [];
}

export function shouldShowMedicine(pet) {
  if (!pet) return false;
  return Boolean(pet.status?.isSick) || (pet.stats?.health || 0) < 60;
}
