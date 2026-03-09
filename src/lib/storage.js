import { CARE_UNLOCK_WINDOW_MS, DEFAULT_SETTINGS } from '../config/appConfig';

const SETTINGS_KEY = 'tamagotchi_settings_v1';
const UNLOCKS_KEY = 'tamagotchi_unlocks_v1';
const LAST_PET_KEY = 'tamagotchi_last_pet_v1';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadUnlockMap() {
  try {
    return JSON.parse(localStorage.getItem(UNLOCKS_KEY) || '{}');
  } catch (error) {
    return {};
  }
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

export function clearLocalAppData() {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(UNLOCKS_KEY);
  localStorage.removeItem(LAST_PET_KEY);
}
