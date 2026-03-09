import { describe, expect, it } from 'vitest';
import {
  getCoverageCell,
  getCoverageProgress,
  getFeedDeliveryProgress,
  getPlayTargetCell,
  getSleepPullProgress,
  isFeedTargetHit,
  isPlayTargetHit
} from '../cleanInteraction';

describe('clean interaction helpers', () => {
  it('maps relative pointer positions into stable grid cells', () => {
    expect(getCoverageCell(0, 0)).toBe('0:0');
    expect(getCoverageCell(0.99, 0.99)).toBe('7:4');
    expect(getCoverageCell(0.5, 0.5)).toBe('4:2');
  });

  it('returns bounded coverage progress', () => {
    expect(getCoverageProgress(0, 8, 5)).toBe(0);
    expect(getCoverageProgress(20, 8, 5)).toBe(0.5);
    expect(getCoverageProgress(99, 8, 5)).toBe(1);
  });

  it('detects feed target and feed progress', () => {
    expect(isFeedTargetHit(0.5, 0.59)).toBe(true);
    expect(isFeedTargetHit(0.15, 0.15)).toBe(false);
    expect(getFeedDeliveryProgress(0, 3)).toBe(0);
    expect(getFeedDeliveryProgress(2, 3)).toBeCloseTo(0.666, 2);
    expect(getFeedDeliveryProgress(8, 3)).toBe(1);
  });

  it('detects play target coverage cells', () => {
    expect(isPlayTargetHit(0.5, 0.59)).toBe(true);
    expect(isPlayTargetHit(0.92, 0.2)).toBe(false);
    expect(getPlayTargetCell(0.5, 0.59)).toBe('3:3');
  });

  it('calculates pull-down sleep progress', () => {
    expect(getSleepPullProgress(0.02)).toBe(0);
    expect(getSleepPullProgress(0.47)).toBeCloseTo(0.5, 1);
    expect(getSleepPullProgress(0.95)).toBe(1);
  });
});
