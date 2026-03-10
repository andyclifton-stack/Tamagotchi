import { decryptSecretWithPin, encryptSecretWithPin } from './pin';

export const ACCESS_RECORD_KIND = 'pet-access';
export const ACCESS_CODE_RECORD_KIND = 'pet-code';

export function buildPetAccessKey(petId) {
  return `pet_${petId}`;
}

export function buildPetCodeKey(code) {
  return `code_${String(code || '').trim().toUpperCase()}`;
}

export function derivePetCode(petId) {
  return String(petId || '')
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase();
}

export function isPetAccessRecord(record) {
  return record?.kind === ACCESS_RECORD_KIND && Boolean(record?.petId);
}

export function isPetCodeRecord(record) {
  return record?.kind === ACCESS_CODE_RECORD_KIND && Boolean(record?.petId) && Boolean(record?.code);
}

export function toPetAccessSummary(record) {
  if (!isPetAccessRecord(record)) {
    return null;
  }

  return {
    id: record.petId,
    petId: record.petId,
    accessKey: record.accessKey || buildPetAccessKey(record.petId),
    petCode: record.petCode || derivePetCode(record.petId),
    ownerUid: record.ownerUid,
    name: record.name,
    speciesId: record.speciesId,
    profileId: record.profileId || '',
    profileName: record.profileName || '',
    profileAvatarId: record.profileAvatarId || '',
    currentStage: record.currentStage,
    currentMood: record.currentMood,
    pinEnabled: Boolean(record.pinEnabled),
    updatedAt: record.updatedAt || 0,
    lastPlayedAt: record.lastPlayedAt || 0,
    avatarSeed: record.avatarSeed || 0,
    sceneSeed: record.sceneSeed || 0,
    theme: record.theme || 'soft3d',
    statusPreview: record.statusPreview || {}
  };
}

export async function buildPetAccessRecord(
  pet,
  {
    existingRecord = null,
    refreshToken = '',
    petPin = '',
    parentPin = ''
  } = {}
) {
  if (!pet?.id || !pet.pinEnabled) {
    return null;
  }

  const nextRecord = {
    kind: ACCESS_RECORD_KIND,
    accessKey: buildPetAccessKey(pet.id),
    petCode: existingRecord?.petCode || derivePetCode(pet.id),
    petId: pet.id,
    ownerUid: pet.ownerUid,
    name: pet.name,
    speciesId: pet.speciesId,
    profileId: pet.profileId || '',
    profileName: pet.profileName || '',
    profileAvatarId: pet.profileAvatarId || '',
    currentStage: pet.currentStage,
    currentMood: pet.currentMood,
    theme: pet.theme,
    pinEnabled: Boolean(pet.pinEnabled),
    updatedAt: pet.updatedAt || Date.now(),
    lastPlayedAt: pet.lastPlayedAt || 0,
    avatarSeed: pet.sceneSeed,
    sceneSeed: pet.sceneSeed,
    statusPreview: {
      sleeping: Boolean(pet.status?.isSleeping),
      sick: Boolean(pet.status?.isSick),
      messCount: pet.stats?.messCount || 0,
      careCenterRest: Boolean(pet.status?.careCenterRest)
    },
    petVault: existingRecord?.petVault || null,
    adminVault: existingRecord?.adminVault || null
  };

  if (refreshToken && petPin) {
    nextRecord.petVault = await encryptSecretWithPin(refreshToken, petPin);
  }

  if (refreshToken && parentPin) {
    nextRecord.adminVault = await encryptSecretWithPin(refreshToken, parentPin);
  }

  return nextRecord;
}

export function buildPetCodeRecord(pet, accessRecord = null) {
  if (!pet?.id || !pet.pinEnabled) {
    return null;
  }

  const code = accessRecord?.petCode || derivePetCode(pet.id);
  return {
    kind: ACCESS_CODE_RECORD_KIND,
    code,
    petId: pet.id,
    updatedAt: pet.updatedAt || Date.now()
  };
}

export async function unlockPetAccess(record, pin) {
  if (!isPetAccessRecord(record)) {
    return null;
  }

  const refreshToken = await decryptSecretWithPin(record.petVault, pin);
  if (!refreshToken) {
    return null;
  }

  return {
    petId: record.petId,
    ownerUid: record.ownerUid,
    refreshToken,
    petPin: String(pin || '').trim(),
    accessMode: 'pet-pin'
  };
}

export async function unlockPetAdminAccess(record, parentPin) {
  if (!isPetAccessRecord(record)) {
    return null;
  }

  const refreshToken = await decryptSecretWithPin(record.adminVault, parentPin);
  if (!refreshToken) {
    return null;
  }

  return {
    petId: record.petId,
    ownerUid: record.ownerUid,
    refreshToken,
    parentPin: String(parentPin || '').trim(),
    accessMode: 'parent-pin'
  };
}
