import { APP_NAME, MAX_CATCHUP_DAYS, STAGES } from '../config/appConfig';
import {
  BABY_TO_CHILD_MS,
  CHILD_TO_TEEN_MS,
  FIFTEEN_MINUTES_MS,
  FORTY_EIGHT_HOURS_MS,
  HATCH_MS,
  SIXTY_MINUTES_MS,
  SLEEP_WINDOWS,
  TEEN_TO_ADULT_MS
} from '../data/evolutionRules';
import { PET_TYPE_MAP } from '../data/petTypes';
import { deriveMood } from './mood';
import { toOwnerSummary, toPublicSnapshot } from './publicSnapshot';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

function deterministicRoll(seed, timestamp, salt = 1) {
  const raw = Math.sin((seed + timestamp / HOUR_MS + salt) * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function getTimePeriod(timestamp) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function getSpecies(pet) {
  return PET_TYPE_MAP[pet.speciesId] || PET_TYPE_MAP.mochi;
}

function getSleepWindow(stage) {
  return SLEEP_WINDOWS[stage] || SLEEP_WINDOWS.adult;
}

function isWithinSleepWindow(timestamp, stage) {
  const date = new Date(timestamp);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const windowDef = getSleepWindow(stage);
  const start = windowDef.startHour * 60 + windowDef.startMinute;
  const end = windowDef.endHour * 60 + windowDef.endMinute;
  if (start <= end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

function nextWakeTimestamp(timestamp, stage) {
  const date = new Date(timestamp);
  const wake = getSleepWindow(stage);
  const wakeDate = new Date(date);
  wakeDate.setHours(wake.endHour, wake.endMinute, 0, 0);
  if (wakeDate.getTime() <= timestamp) {
    wakeDate.setDate(wakeDate.getDate() + 1);
  }
  return wakeDate.getTime();
}

function canSleep(pet, timestamp) {
  if (pet.currentStage === 'egg') return false;
  if (pet.status.asleepUntil && pet.status.asleepUntil > timestamp) return true;
  const nearBedtime = isWithinSleepWindow(timestamp, pet.currentStage);
  return nearBedtime && (pet.status.lightsOff || pet.stats.energy < 35);
}

function addEvent(events, timestamp, type, message, meta = {}) {
  events.push({
    at: timestamp,
    type,
    message,
    meta
  });
}

function updateMood(pet) {
  const descriptor = deriveMood(pet);
  pet.currentMood = descriptor.id;
  pet.moodInfo = descriptor;
  pet.timeOfDay = getTimePeriod(pet.lastSimulatedAt);
}

function getAgeSinceHatch(pet, timestamp) {
  return pet.hatchedAt ? Math.max(0, timestamp - pet.hatchedAt) : 0;
}

function getAdultBranch(pet) {
  const score =
    pet.growth.careMoments * 1.15 +
    pet.growth.disciplineUses * 1.25 +
    pet.growth.illnessRecoveries * 1.2 -
    pet.growth.neglectMoments * 1.35 -
    pet.growth.snackOveruseCount * 1.1 -
    pet.growth.rescueCount * 1.5;

  if (score >= 10 && pet.stats.discipline >= 45 && pet.stats.health >= 50) {
    return 'bright';
  }
  return 'scruffy';
}

function advanceStageIfNeeded(pet, timestamp, events) {
  if (pet.currentStage === 'egg' && timestamp - pet.createdAt >= HATCH_MS) {
    pet.currentStage = 'baby';
    pet.hatchedAt = timestamp;
    pet.stageStartedAt = timestamp;
    pet.growth.stageHistory.push({ stage: 'baby', at: timestamp });
    addEvent(events, timestamp, 'hatch', `${pet.name} hatched into a baby.`);
  }

  const ageSinceHatch = getAgeSinceHatch(pet, timestamp);

  if (pet.currentStage === 'baby' && ageSinceHatch >= BABY_TO_CHILD_MS) {
    pet.currentStage = 'child';
    pet.stageStartedAt = timestamp;
    pet.growth.stageHistory.push({ stage: 'child', at: timestamp });
    addEvent(events, timestamp, 'growth', `${pet.name} grew into a child.`);
  }

  if (pet.currentStage === 'child' && ageSinceHatch >= CHILD_TO_TEEN_MS) {
    pet.currentStage = 'teen';
    pet.stageStartedAt = timestamp;
    pet.growth.stageHistory.push({ stage: 'teen', at: timestamp });
    addEvent(events, timestamp, 'growth', `${pet.name} became a teen.`);
  }

  if (pet.currentStage === 'teen' && ageSinceHatch >= TEEN_TO_ADULT_MS) {
    pet.currentStage = 'adult';
    pet.evolutionBranch = getAdultBranch(pet);
    pet.stageStartedAt = timestamp;
    pet.growth.stageHistory.push({ stage: 'adult', at: timestamp, branch: pet.evolutionBranch });
    addEvent(
      events,
      timestamp,
      'evolution',
      `${pet.name} evolved into an adult ${pet.evolutionBranch} form.`,
      { branch: pet.evolutionBranch }
    );
  }
}

function modifyStat(stats, key, delta) {
  stats[key] = clamp((stats[key] || 0) + delta);
}

function simulateStep(pet, stepStart, stepEnd, events) {
  if (pet.status.careCenterRest) {
    pet.lastSimulatedAt = stepEnd;
    updateMood(pet);
    return;
  }

  advanceStageIfNeeded(pet, stepEnd, events);
  const species = getSpecies(pet);
  const stepHours = (stepEnd - stepStart) / HOUR_MS;
  const sleeping = canSleep(pet, stepEnd);
  pet.status.isSleeping = sleeping;

  if (pet.status.asleepUntil && pet.status.asleepUntil <= stepEnd) {
    pet.status.asleepUntil = null;
    pet.status.isSleeping = false;
  }

  if (pet.currentStage !== 'egg') {
    const hungerRate = 3.2 * species.tendencies.hungerRate;
    const affectionRate = 2.1 * species.tendencies.affectionRate;
    const hygieneRate = 1.35 * species.tendencies.hygieneRate;
    const energyDrain = 3.1 * species.tendencies.energyDrain;
    const disciplineRate = 0.75 * species.tendencies.disciplineRate;

    modifyStat(pet.stats, 'hunger', -(sleeping ? hungerRate * 0.35 : hungerRate) * stepHours);
    modifyStat(pet.stats, 'happiness', -(sleeping ? 0.65 : 1.9) * stepHours);
    modifyStat(
      pet.stats,
      'energy',
      sleeping ? 8.8 * species.tendencies.energyRecovery * stepHours : -energyDrain * stepHours
    );
    modifyStat(
      pet.stats,
      'hygiene',
      -(sleeping ? hygieneRate * 0.4 : hygieneRate + pet.stats.messCount * 0.8) * stepHours
    );
    modifyStat(pet.stats, 'toilet', (sleeping ? 1.15 : 2.6) * stepHours);
    modifyStat(pet.stats, 'affection', -(sleeping ? affectionRate * 0.3 : affectionRate) * stepHours);
    modifyStat(pet.stats, 'discipline', -(sleeping ? disciplineRate * 0.45 : disciplineRate) * stepHours);

    const poorNeeds = [
      pet.stats.hunger < 28,
      pet.stats.energy < 24,
      pet.stats.hygiene < 30,
      pet.stats.affection < 28,
      pet.stats.happiness < 28,
      pet.stats.messCount >= 2
    ].filter(Boolean).length;

    const strongNeeds = [
      pet.stats.hunger > 64,
      pet.stats.energy > 56,
      pet.stats.hygiene > 64,
      pet.stats.affection > 56,
      pet.stats.happiness > 56,
      pet.stats.messCount === 0
    ].filter(Boolean).length;

    if (poorNeeds >= 3) {
      pet.growth.neglectMoments += 1;
      modifyStat(pet.stats, 'health', -(2.4 + poorNeeds * 0.35) * stepHours);
    } else if (strongNeeds >= 5) {
      pet.growth.careMoments += 1;
      modifyStat(pet.stats, 'health', 1.1 * stepHours);
    } else {
      modifyStat(pet.stats, 'health', pet.status.isSick ? -1.6 * stepHours : 0.25 * stepHours);
    }

    const illnessPressureDelta =
      poorNeeds >= 3 || pet.stats.messCount > 0 || pet.stats.hygiene < 35
        ? 1.2 * stepHours
        : -0.9 * stepHours;
    pet.status.illnessPressure = clamp((pet.status.illnessPressure || 0) + illnessPressureDelta);

    if (!pet.status.isSick && pet.status.illnessPressure > 6.5) {
      pet.status.isSick = true;
      addEvent(events, stepEnd, 'illness', `${pet.name} is feeling sick.`);
    }

    if (pet.status.isSick && pet.stats.health > 78 && pet.stats.hygiene > 55) {
      pet.status.isSick = false;
      pet.status.illnessPressure = clamp(pet.status.illnessPressure - 2);
      addEvent(events, stepEnd, 'recovery', `${pet.name} is recovering naturally.`);
    }

    const accidentChance =
      pet.stats.toilet > 82
        ? Math.min(0.85, 0.18 + (pet.stats.toilet - 82) / 30 + (40 - pet.stats.discipline) / 120)
        : 0;
    if (
      accidentChance > 0 &&
      pet.stats.messCount < 3 &&
      deterministicRoll(pet.sceneSeed, stepEnd, 3) < accidentChance
    ) {
      pet.stats.messCount += 1;
      pet.stats.toilet = clamp(pet.stats.toilet - 34);
      addEvent(events, stepEnd, 'mess', `${pet.name} made a mess.`);
    }

    if (!pet.liveForeverMode) {
      const severeNeglect =
        pet.stats.health < 8 &&
        pet.stats.hunger < 6 &&
        pet.stats.energy < 6 &&
        pet.stats.hygiene < 8 &&
        pet.stats.messCount >= 2;
      if (severeNeglect) {
        pet.status.careCenterRest = true;
        pet.status.isSleeping = false;
        addEvent(
          events,
          stepEnd,
          'care-center',
          `${pet.name} has gone to the Care Center to rest.`
        );
      }
    }
  }

  pet.stats.toilet = clamp(pet.stats.toilet);
  pet.stats.messCount = Math.max(0, Math.min(3, Math.round(pet.stats.messCount)));
  pet.lastSimulatedAt = stepEnd;
  pet.updatedAt = stepEnd;
  updateMood(pet);
}

export function simulatePetState(petRecord, now = Date.now()) {
  const pet = clone(petRecord);
  const events = [];
  const fromTime = pet.lastSimulatedAt || pet.createdAt || now;
  const cappedNow = Math.min(now, fromTime + MAX_CATCHUP_DAYS * DAY_MS);

  if (cappedNow <= fromTime) {
    updateMood(pet);
    return {
      pet,
      events,
      summary: toOwnerSummary(pet),
      publicSnapshot: toPublicSnapshot(pet)
    };
  }

  let cursor = fromTime;
  while (cursor < cappedNow) {
    const elapsedSinceStart = cursor - fromTime;
    const step = elapsedSinceStart < FORTY_EIGHT_HOURS_MS ? FIFTEEN_MINUTES_MS : SIXTY_MINUTES_MS;
    const next = Math.min(cappedNow, cursor + step);
    simulateStep(pet, cursor, next, events);
    cursor = next;
    if (pet.status.careCenterRest) {
      break;
    }
  }

  pet.lastPlayedAt = now;
  pet.updatedAt = now;
  pet.timeOfDay = getTimePeriod(now);
  updateMood(pet);

  return {
    pet,
    events,
    summary: toOwnerSummary(pet),
    publicSnapshot: toPublicSnapshot(pet)
  };
}

export function getPetAdvice(pet) {
  if (pet.status?.careCenterRest) {
    return 'This pet needs parent rescue from the Care Center.';
  }

  const focus = [
    ['Hunger', pet.stats.hunger],
    ['Energy', pet.stats.energy],
    ['Hygiene', pet.stats.hygiene],
    ['Affection', pet.stats.affection],
    ['Health', pet.stats.health]
  ].sort((a, b) => a[1] - b[1]);

  return `Focus on ${focus[0][0].toLowerCase()} first, then ${focus[1][0].toLowerCase()}.`;
}

export function getTimeOfDayLabel(pet) {
  const key = pet.timeOfDay || 'day';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function getSimulationMetadata(pet) {
  return {
    appName: APP_NAME,
    stages: STAGES,
    timeOfDay: getTimePeriod(pet.lastSimulatedAt || Date.now())
  };
}

export function isPetSleepingNow(pet, now = Date.now()) {
  if (pet.status?.asleepUntil && pet.status.asleepUntil > now) {
    return true;
  }
  return isWithinSleepWindow(now, pet.currentStage) && Boolean(pet.status?.lightsOff);
}

export function getNextWakeTime(pet, now = Date.now()) {
  return nextWakeTimestamp(now, pet.currentStage);
}
