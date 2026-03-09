import { createSalt, hashPin, verifyPin } from './pin';
import {
  clearParentGateState,
  getParentGateState,
  getParentPinRecord,
  saveParentPinRecord,
  setParentGateState
} from './storage';

function toDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidParentPin(pin) {
  return /^\d{4}$/.test(pin);
}

export function getParentAccess() {
  return {
    gate: getParentGateState(),
    hasPin: Boolean(getParentPinRecord())
  };
}

export async function setupParentPin(pin, confirmPin) {
  const nextPin = toDigits(pin);
  const nextConfirm = toDigits(confirmPin);
  if (!isValidParentPin(nextPin)) {
    return { ok: false, reason: 'pin-format' };
  }
  if (nextPin !== nextConfirm) {
    return { ok: false, reason: 'pin-mismatch' };
  }

  const salt = createSalt();
  const pinHash = await hashPin(nextPin, salt);
  saveParentPinRecord({
    pinHash,
    pinSalt: salt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  });
  const gate = setParentGateState({ unlocked: true });
  return { ok: true, gate };
}

export async function unlockParentGate(pin) {
  const normalized = toDigits(pin);
  const record = getParentPinRecord();
  if (!record?.pinHash || !record?.pinSalt) {
    return { ok: false, reason: 'pin-missing' };
  }
  if (!isValidParentPin(normalized)) {
    return { ok: false, reason: 'pin-format' };
  }
  const valid = await verifyPin(normalized, record.pinHash, record.pinSalt);
  if (!valid) {
    return { ok: false, reason: 'pin-invalid' };
  }
  const gate = setParentGateState({ unlocked: true });
  return { ok: true, gate };
}

export function lockParentGate() {
  clearParentGateState();
}

export function isParentGateUnlocked() {
  return getParentGateState().unlocked;
}
