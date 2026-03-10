export const SHARED_PROFILE_ID = 'shared';

export const KID_AVATARS = [
  { id: 'star', emoji: '🌟', label: 'Star' },
  { id: 'moon', emoji: '🌙', label: 'Moon' },
  { id: 'heart', emoji: '💖', label: 'Heart' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { id: 'flower', emoji: '🌼', label: 'Flower' },
  { id: 'spark', emoji: '✨', label: 'Spark' }
];

const MAX_NAME_LENGTH = 18;

function cleanName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function getAvatarById(avatarId) {
  return KID_AVATARS.find((avatar) => avatar.id === avatarId) || KID_AVATARS[0];
}

export function createKidProfile(input, now = Date.now()) {
  const avatar = getAvatarById(input?.avatarId);
  return {
    id: crypto.randomUUID(),
    name: cleanName(input?.name) || 'Player',
    avatarId: avatar.id,
    createdAt: now,
    lastUsedAt: now
  };
}

export function touchKidProfile(profile, now = Date.now()) {
  return {
    ...profile,
    lastUsedAt: now
  };
}

export function isSharedProfileId(profileId) {
  return profileId === SHARED_PROFILE_ID;
}

export function getSharedProfile(pets = []) {
  const sharedUpdatedAt = pets
    .filter((pet) => !pet.profileId)
    .reduce((latest, pet) => Math.max(latest, pet.updatedAt || pet.lastPlayedAt || 0), 0);

  return {
    id: SHARED_PROFILE_ID,
    name: 'Shared',
    avatarId: 'spark',
    createdAt: 0,
    lastUsedAt: sharedUpdatedAt,
    system: true
  };
}

function normalizeStoredProfile(profile) {
  if (!profile?.id) return null;
  const avatar = getAvatarById(profile.avatarId);
  return {
    id: profile.id,
    name: cleanName(profile.name) || 'Player',
    avatarId: avatar.id,
    createdAt: Number(profile.createdAt) || 0,
    lastUsedAt: Number(profile.lastUsedAt) || Number(profile.createdAt) || 0
  };
}

export function reconcileKidProfiles(profiles = [], pets = []) {
  const profileMap = new Map();

  profiles.forEach((profile) => {
    const normalized = normalizeStoredProfile(profile);
    if (normalized) {
      profileMap.set(normalized.id, normalized);
    }
  });

  pets.forEach((pet) => {
    if (!pet?.profileId) return;

    const current = profileMap.get(pet.profileId);
    const fallbackAvatar = getAvatarById(pet.profileAvatarId).id;
    const fallbackName = cleanName(pet.profileName) || 'Player';
    const nextLastUsed = Math.max(
      current?.lastUsedAt || 0,
      pet.updatedAt || 0,
      pet.lastPlayedAt || 0
    );

    profileMap.set(pet.profileId, {
      id: pet.profileId,
      name: current?.name || fallbackName,
      avatarId: current?.avatarId || fallbackAvatar,
      createdAt: current?.createdAt || Number(pet.createdAt) || 0,
      lastUsedAt: nextLastUsed
    });
  });

  return Array.from(profileMap.values()).sort((left, right) => {
    if ((right.lastUsedAt || 0) !== (left.lastUsedAt || 0)) {
      return (right.lastUsedAt || 0) - (left.lastUsedAt || 0);
    }
    return left.name.localeCompare(right.name);
  });
}

export function getDisplayProfiles(profiles = [], pets = []) {
  const reconciled = reconcileKidProfiles(profiles, pets);
  if (pets.some((pet) => !pet.profileId)) {
    return [...reconciled, getSharedProfile(pets)];
  }
  return reconciled;
}

export function getPetsForProfile(pets = [], profileId = '') {
  if (isSharedProfileId(profileId)) {
    return pets.filter((pet) => !pet.profileId);
  }
  return pets.filter((pet) => pet.profileId === profileId);
}

export function buildPetProfileFields(profile) {
  if (!profile || isSharedProfileId(profile.id)) {
    return {
      profileId: '',
      profileName: '',
      profileAvatarId: ''
    };
  }

  return {
    profileId: profile.id,
    profileName: profile.name,
    profileAvatarId: getAvatarById(profile.avatarId).id
  };
}
