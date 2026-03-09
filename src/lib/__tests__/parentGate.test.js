import { beforeEach, describe, expect, it } from 'vitest';
import {
  getParentAccess,
  lockParentGate,
  setupParentPin,
  unlockParentGate
} from '../parentGate';
import { clearParentGateState, clearParentPinRecord } from '../storage';

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

describe('parent gate flow', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock();
    clearParentGateState();
    clearParentPinRecord();
  });

  it('requires setup before unlock and then unlocks with the configured pin', async () => {
    expect(getParentAccess().hasPin).toBe(false);

    const setup = await setupParentPin('1234', '1234');
    expect(setup.ok).toBe(true);
    expect(getParentAccess().hasPin).toBe(true);
    expect(getParentAccess().gate.unlocked).toBe(true);

    lockParentGate();
    expect(getParentAccess().gate.unlocked).toBe(false);

    const badUnlock = await unlockParentGate('0000');
    expect(badUnlock.ok).toBe(false);

    const goodUnlock = await unlockParentGate('1234');
    expect(goodUnlock.ok).toBe(true);
    expect(getParentAccess().gate.unlocked).toBe(true);
  });

  it('does not allow 999 to bypass the configured parent pin', async () => {
    await setupParentPin('2468', '2468');
    lockParentGate();

    const result = await unlockParentGate('999');
    expect(result.ok).toBe(false);
    expect(getParentAccess().gate.unlocked).toBe(false);
  });
});
