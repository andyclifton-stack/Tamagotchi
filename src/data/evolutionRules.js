export const HATCH_MS = 15 * 60 * 1000;
export const BABY_TO_CHILD_MS = 10 * 60 * 60 * 1000;
export const CHILD_TO_TEEN_MS = 28 * 60 * 60 * 1000;
export const TEEN_TO_ADULT_MS = 72 * 60 * 60 * 1000;
export const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const SIXTY_MINUTES_MS = 60 * 60 * 1000;

export const SLEEP_WINDOWS = {
  egg: { startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 },
  baby: { startHour: 20, startMinute: 30, endHour: 7, endMinute: 0 },
  child: { startHour: 21, startMinute: 0, endHour: 7, endMinute: 0 },
  teen: { startHour: 22, startMinute: 0, endHour: 7, endMinute: 0 },
  adult: { startHour: 22, startMinute: 0, endHour: 7, endMinute: 0 }
};
