export const APP_NAME = 'Tamagotchi';
export const APP_BASE_PATH = '/Tamagotchi/';
export const APP_SHARE_URL = 'https://fingergame.co.uk/Tamagotchi/';
export const MASTER_PIN = '999';
export const SAVE_VERSION = 1;
export const ROOT_PATH = 'tamagotchi/v1';
export const MAX_CATCHUP_DAYS = 7;
export const CARE_UNLOCK_WINDOW_MS = 15 * 60 * 1000;
export const PARENT_GATE_UNLOCK_WINDOW_MS = 30 * 60 * 1000;

export const STAGES = ['egg', 'baby', 'child', 'teen', 'adult'];

export const STAGE_LABELS = {
  egg: 'Egg',
  baby: 'Baby',
  child: 'Child',
  teen: 'Teen',
  adult: 'Adult'
};

export const ACTION_TYPES = {
  FEED_MEAL: 'feedMeal',
  GIVE_SNACK: 'giveSnack',
  CLEAN_WASH: 'cleanWash',
  TOILET: 'toilet',
  GIVE_MEDICINE: 'giveMedicine',
  TOGGLE_LIGHTS: 'toggleLights',
  REST: 'rest',
  COMFORT: 'comfort',
  CHECK_STATUS: 'checkStatus',
  DISCIPLINE: 'discipline'
};

export const DEFAULT_SETTINGS = {
  soundEnabled: true,
  reducedMotion: false,
  defaultTheme: 'soft3d'
};
