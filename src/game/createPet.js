import { SAVE_VERSION } from '../config/appConfig';
import { createSalt, hashPin } from '../lib/pin';

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

function randomValue(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

export async function createPet(input, ownerUid, now = Date.now()) {
  const pinEnabled = Boolean(input.pin?.trim());
  const salt = pinEnabled ? createSalt() : '';
  const pinHash = pinEnabled ? await hashPin(input.pin.trim(), salt) : '';

  return {
    id: crypto.randomUUID(),
    ownerUid,
    name: input.name.trim(),
    nameKey: normalizeName(input.name),
    speciesId: input.speciesId,
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    lastSimulatedAt: now,
    stageStartedAt: now,
    hatchedAt: null,
    currentStage: 'egg',
    evolutionBranch: null,
    currentMood: 'content',
    profileId: input.profileId || '',
    profileName: input.profileName || '',
    profileAvatarId: input.profileAvatarId || '',
    theme: input.theme,
    liveForeverMode: Boolean(input.liveForeverMode),
    pinEnabled,
    pinHash,
    pinSalt: salt,
    status: {
      isSleeping: false,
      isSick: false,
      lightsOff: false,
      careCenterRest: false,
      illnessPressure: 0,
      asleepUntil: null,
      lastMealAt: null,
      lastSnackAt: null,
      lastMedicineAt: null,
      lastComfortAt: null,
      lastDisciplineAt: null,
      lastActionAt: now
    },
    stats: {
      hunger: randomValue(78, 88),
      happiness: randomValue(70, 82),
      energy: randomValue(88, 96),
      hygiene: randomValue(78, 88),
      health: randomValue(92, 98),
      toilet: randomValue(8, 16),
      affection: randomValue(72, 84),
      discipline: randomValue(56, 68),
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
    sceneSeed: randomValue(1000, 999999),
    archived: false,
    version: SAVE_VERSION
  };
}

export function createPetFromSnapshot(snapshot, ownerUid, now = Date.now()) {
  const nextPet = JSON.parse(JSON.stringify(snapshot));
  nextPet.id = crypto.randomUUID();
  nextPet.ownerUid = ownerUid;
  nextPet.updatedAt = now;
  nextPet.lastPlayedAt = now;
  nextPet.lastSimulatedAt = snapshot.lastSimulatedAt || now;
  nextPet.share = {
    shareToken: null,
    shareEnabled: false,
    sharedAt: null
  };
  nextPet.archived = false;
  nextPet.version = SAVE_VERSION;
  return nextPet;
}
