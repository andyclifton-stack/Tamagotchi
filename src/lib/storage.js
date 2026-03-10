import {
  CARE_UNLOCK_WINDOW_MS,
  DEFAULT_SETTINGS,
  PARENT_GATE_UNLOCK_WINDOW_MS
} from '../config/appConfig';

const SETTINGS_KEY = 'tamagotchi_settings_v1';
const UNLOCKS_KEY = 'tamagotchi_unlocks_v1';
const LAST_PET_KEY = 'tamagotchi_last_pet_v1';
const PARENT_GATE_KEY = 'tamagotchi_parent_gate_v1';
const PARENT_PIN_KEY = 'tamagotchi_parent_pin_v1';
const PET_CACHE_KEY = 'tamagotchi_pet_cache_v1';
const PROFILES_KEY = 'tamagotchi_profiles_v1';
const ACTIVE_PROFILE_KEY = 'tamagotchi_active_profile_v1';

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function loadSettings() {
  const parsed = safeParse(localStorage.getItem(SETTINGS_KEY), null);
  if (!parsed) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...parsed };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadUnlockMap() {
  return safeParse(localStorage.getItem(UNLOCKS_KEY), {});
}

function saveUnlockMap(data) {
  localStorage.setItem(UNLOCKS_KEY, JSON.stringify(data));
}

export function getUnlockState(petId, now = Date.now()) {
  if (!petId) {
    return { careUnlocked: false, adminUnlocked: false, expiresAt: 0 };
  }
  const map = loadUnlockMap();
  const entry = map[petId];
  if (!entry) {
    return { careUnlocked: false, adminUnlocked: false, expiresAt: 0 };
  }
  if (entry.expiresAt <= now) {
    delete map[petId];
    saveUnlockMap(map);
    return { careUnlocked: false, adminUnlocked: false, expiresAt: 0 };
  }
  return entry;
}

export function setUnlockState(petId, options = {}) {
  const map = loadUnlockMap();
  const current = getUnlockState(petId);
  const next = {
    careUnlocked: options.careUnlocked ?? current.careUnlocked,
    adminUnlocked: options.adminUnlocked ?? current.adminUnlocked,
    expiresAt: options.expiresAt ?? Date.now() + CARE_UNLOCK_WINDOW_MS
  };
  map[petId] = next;
  saveUnlockMap(map);
  return next;
}

export function clearUnlockState(petId) {
  const map = loadUnlockMap();
  delete map[petId];
  saveUnlockMap(map);
}

export function setLastPetId(petId) {
  localStorage.setItem(LAST_PET_KEY, petId);
}

export function getLastPetId() {
  return localStorage.getItem(LAST_PET_KEY) || '';
}

export function getCachedPetSnapshot() {
  return safeParse(localStorage.getItem(PET_CACHE_KEY), null);
}

export function saveCachedPetSnapshot(pet) {
  if (!pet?.id) return;
  localStorage.setItem(PET_CACHE_KEY, JSON.stringify(pet));
}

export function clearCachedPetSnapshot() {
  localStorage.removeItem(PET_CACHE_KEY);
}

export function loadKidProfiles() {
  return safeParse(localStorage.getItem(PROFILES_KEY), []);
}

export function saveKidProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles || []));
}

export function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || '';
}

export function setActiveProfileId(profileId) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId || '');
}

export function clearActiveProfileId() {
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}

export function getParentGateState(now = Date.now()) {
  const current = safeParse(localStorage.getItem(PARENT_GATE_KEY), null);
  if (!current || !current.unlocked || current.expiresAt <= now) {
    return { unlocked: false, expiresAt: 0 };
  }
  return current;
}

export function setParentGateState(options = {}, now = Date.now()) {
  const next = {
    unlocked: Boolean(options.unlocked),
    expiresAt:
      options.expiresAt ??
      (options.unlocked ? now + PARENT_GATE_UNLOCK_WINDOW_MS : 0)
  };
  localStorage.setItem(PARENT_GATE_KEY, JSON.stringify(next));
  return next;
}

export function clearParentGateState() {
  localStorage.removeItem(PARENT_GATE_KEY);
}

export function getParentPinRecord() {
  return safeParse(localStorage.getItem(PARENT_PIN_KEY), null);
}

export function saveParentPinRecord(record) {
  localStorage.setItem(PARENT_PIN_KEY, JSON.stringify(record));
}

export function clearParentPinRecord() {
  localStorage.removeItem(PARENT_PIN_KEY);
}

export function clearLocalAppData() {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(UNLOCKS_KEY);
  localStorage.removeItem(LAST_PET_KEY);
  localStorage.removeItem(PARENT_GATE_KEY);
  localStorage.removeItem(PARENT_PIN_KEY);
  localStorage.removeItem(PET_CACHE_KEY);
  localStorage.removeItem(PROFILES_KEY);
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}
