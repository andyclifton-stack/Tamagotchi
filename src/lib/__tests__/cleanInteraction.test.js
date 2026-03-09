import { describe, expect, it } from 'vitest';
import { getCoverageCell, getCoverageProgress } from '../cleanInteraction';

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
});
