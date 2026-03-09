import { ACTION_TYPES } from '../config/appConfig';
import { deriveMood } from './mood';
import { simulatePetState, getNextWakeTime } from './simulation';
import { toOwnerSummary, toPublicSnapshot } from './publicSnapshot';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

function applyDelta(stats, key, delta) {
  stats[key] = clamp((stats[key] || 0) + delta, 0, 100);
}

function addEvent(events, at, type, message, meta = {}) {
  events.push({ at, type, message, meta });
}

function finalise(pet, now, events, reaction) {
  pet.lastPlayedAt = now;
  pet.lastSimulatedAt = now;
  pet.updatedAt = now;
  pet.currentMood = deriveMood(pet).id;
  return {
    pet,
    events,
    reaction,
    summary: toOwnerSummary(pet),
    publicSnapshot: toPublicSnapshot(pet)
  };
}

export function applyPetAction(petRecord, action, now = Date.now()) {
  const simulated = simulatePetState(petRecord, now);
  const pet = clone(simulated.pet);
  const events = [...simulated.events];
  let reaction = 'tap';

  if (pet.status.careCenterRest && action.type !== 'admin') {
    addEvent(events, now, 'blocked', 'Care actions are blocked while at the Care Center.');
    return finalise(pet, now, events, 'sad');
  }

  if (
    pet.currentStage === 'egg' &&
    ![
      ACTION_TYPES.COMFORT,
      ACTION_TYPES.CHECK_STATUS,
      ACTION_TYPES.TOGGLE_LIGHTS,
      ACTION_TYPES.FEED_MEAL,
      ACTION_TYPES.CLEAN_WASH,
      ACTION_TYPES.TOILET,
      ACTION_TYPES.REST,
      ACTION_TYPES.GIVE_MEDICINE
    ].includes(action.type)
  ) {
    addEvent(events, now, 'blocked', 'The egg is not ready for that action yet.');
    return finalise(pet, now, events, 'tap');
  }

  switch (action.type) {
    case ACTION_TYPES.FEED_MEAL: {
      applyDelta(pet.stats, 'hunger', 28);
      applyDelta(pet.stats, 'happiness', 4);
      applyDelta(pet.stats, 'toilet', 8);
      if (pet.stats.hunger > 92) {
        applyDelta(pet.stats, 'health', -3);
      } else {
        applyDelta(pet.stats, 'health', 2);
      }
      pet.status.lastMealAt = now;
      addEvent(events, now, 'feed', `${pet.name} enjoyed a proper meal.`);
      reaction = 'feed';
      break;
    }
    case ACTION_TYPES.GIVE_SNACK: {
      applyDelta(pet.stats, 'hunger', 10);
      applyDelta(pet.stats, 'happiness', 18);
      applyDelta(pet.stats, 'toilet', 10);
      if (pet.status.lastSnackAt && now - pet.status.lastSnackAt < 3 * 60 * 60 * 1000) {
        applyDelta(pet.stats, 'discipline', -6);
        pet.growth.snackOveruseCount += 1;
      }
      pet.status.lastSnackAt = now;
      addEvent(events, now, 'snack', `${pet.name} had a snack.`);
      reaction = 'happy';
      break;
    }
    case ACTION_TYPES.CLEAN_WASH: {
      applyDelta(pet.stats, 'hygiene', 32);
      applyDelta(pet.stats, 'happiness', 4);
      addEvent(events, now, 'clean', `${pet.name} feels fresh and clean.`);
      reaction = 'clean';
      break;
    }
    case ACTION_TYPES.TOILET: {
      if (pet.stats.messCount > 0) {
        pet.stats.messCount -= 1;
        applyDelta(pet.stats, 'hygiene', 12);
        applyDelta(pet.stats, 'health', 4);
        addEvent(events, now, 'mess-clear', 'One mess was cleaned up.');
      } else {
        applyDelta(pet.stats, 'toilet', -28);
        addEvent(events, now, 'toilet', `${pet.name} got a bathroom break.`);
      }
      reaction = 'clean';
      break;
    }
    case ACTION_TYPES.GIVE_MEDICINE: {
      if (pet.status.isSick || pet.stats.health < 65) {
        pet.status.isSick = false;
        pet.status.illnessPressure = clamp((pet.status.illnessPressure || 0) - 4, 0, 100);
        applyDelta(pet.stats, 'health', 26);
        applyDelta(pet.stats, 'happiness', -4);
        pet.growth.illnessRecoveries += 1;
        addEvent(events, now, 'medicine', `${pet.name} took medicine and started feeling better.`);
        reaction = 'medicine';
      } else {
        applyDelta(pet.stats, 'happiness', -2);
        addEvent(events, now, 'medicine', `${pet.name} did not really need medicine.`);
        reaction = 'tap';
      }
      pet.status.lastMedicineAt = now;
      break;
    }
    case ACTION_TYPES.TOGGLE_LIGHTS: {
      pet.status.lightsOff = action.payload?.lightsOff ?? !pet.status.lightsOff;
      if (pet.status.lightsOff && (pet.stats.energy < 45 || pet.currentStage !== 'egg')) {
        pet.status.asleepUntil = getNextWakeTime(pet, now);
        pet.status.isSleeping = true;
      } else if (!pet.status.lightsOff) {
        pet.status.asleepUntil = null;
        pet.status.isSleeping = false;
        applyDelta(pet.stats, 'happiness', 3);
      }
      addEvent(
        events,
        now,
        'lights',
        pet.status.lightsOff ? 'Lights off for bedtime.' : 'Lights on for playtime.'
      );
      reaction = pet.status.lightsOff ? 'sleep' : 'tap';
      break;
    }
    case ACTION_TYPES.REST: {
      if (pet.stats.energy < 35 || pet.status.lightsOff) {
        pet.status.asleepUntil = getNextWakeTime(pet, now);
        pet.status.isSleeping = true;
        applyDelta(pet.stats, 'energy', 8);
      } else {
        applyDelta(pet.stats, 'energy', 14);
      }
      applyDelta(pet.stats, 'health', 2);
      addEvent(events, now, 'rest', `${pet.name} is settling down to rest.`);
      reaction = 'sleep';
      break;
    }
    case ACTION_TYPES.COMFORT: {
      applyDelta(pet.stats, 'affection', 18);
      applyDelta(pet.stats, 'happiness', 12);
      if (pet.stats.affection < 35) {
        applyDelta(pet.stats, 'discipline', 3);
      }
      pet.status.lastComfortAt = now;
      addEvent(events, now, 'comfort', `${pet.name} loved the extra attention.`);
      reaction = 'happy';
      break;
    }
    case ACTION_TYPES.CHECK_STATUS: {
      addEvent(events, now, 'status', 'Status checked.');
      reaction = 'tap';
      break;
    }
    case ACTION_TYPES.DISCIPLINE: {
      applyDelta(pet.stats, 'discipline', 15);
      applyDelta(pet.stats, 'happiness', -5);
      pet.growth.disciplineUses += 1;
      pet.status.lastDisciplineAt = now;
      addEvent(events, now, 'discipline', `${pet.name} had a short training moment.`);
      reaction = 'tap';
      break;
    }
    case 'admin': {
      const adminAction = action.payload?.kind;
      if (adminAction === 'heal') {
        pet.status.isSick = false;
        pet.status.careCenterRest = false;
        pet.status.illnessPressure = 0;
        applyDelta(pet.stats, 'health', 30);
      }
      if (adminAction === 'clean') {
        pet.stats.messCount = 0;
        applyDelta(pet.stats, 'hygiene', 40);
      }
      if (adminAction === 'joy') {
        applyDelta(pet.stats, 'happiness', 35);
        applyDelta(pet.stats, 'affection', 18);
      }
      if (adminAction === 'energy') {
        applyDelta(pet.stats, 'energy', 45);
      }
      if (adminAction === 'restore') {
        Object.assign(pet.stats, {
          hunger: 86,
          happiness: 84,
          energy: 88,
          hygiene: 86,
          health: 92,
          toilet: 18,
          affection: 82,
          discipline: clamp(pet.stats.discipline + 12),
          messCount: 0
        });
        pet.status.isSick = false;
        pet.status.careCenterRest = false;
        pet.status.illnessPressure = 0;
      }
      if (adminAction === 'manual-stats' && action.payload?.stats) {
        Object.entries(action.payload.stats).forEach(([key, value]) => {
          if (key === 'messCount') {
            pet.stats.messCount = Math.max(0, Math.min(3, Number(value)));
          } else {
            pet.stats[key] = clamp(Number(value));
          }
        });
      }
      if (adminAction === 'toggle-live-forever') {
        pet.liveForeverMode = !pet.liveForeverMode;
      }
      if (adminAction === 'force-stage' && action.payload?.stage) {
        pet.currentStage = action.payload.stage;
        pet.stageStartedAt = now;
        if (action.payload.stage === 'adult') {
          pet.evolutionBranch = action.payload.branch || pet.evolutionBranch || 'bright';
        }
        pet.growth.stageHistory.push({
          stage: pet.currentStage,
          at: now,
          branch: pet.evolutionBranch || null
        });
      }
      if (adminAction === 'rename' && action.payload?.name) {
        pet.name = action.payload.name.trim();
        pet.nameKey = pet.name.toLowerCase().replace(/\s+/g, '-');
      }
      addEvent(events, now, 'admin', `Parent tool used: ${adminAction}.`, action.payload || {});
      pet.growth.rescueCount += 1;
      reaction = 'happy';
      break;
    }
    default:
      break;
  }

  pet.currentMood = deriveMood(pet).id;
  return finalise(pet, now, events, reaction);
}
