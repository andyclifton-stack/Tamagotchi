import { describe, expect, it } from 'vitest';
import { createSalt, hashPin, isMasterPin, verifyPin } from '../pin';

describe('pin helpers', () => {
  it('hashes and verifies a pet pin', async () => {
    const salt = createSalt();
    const hashed = await hashPin('1234', salt);

    expect(await verifyPin('1234', hashed, salt)).toBe(true);
    expect(await verifyPin('9876', hashed, salt)).toBe(false);
  });

  it('accepts the master pin shortcut', async () => {
    const salt = createSalt();
    const hashed = await hashPin('1234', salt);

    expect(isMasterPin('999')).toBe(true);
    expect(await verifyPin('999', hashed, salt)).toBe(true);
  });
});
