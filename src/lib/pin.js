import { MASTER_PIN } from '../config/appConfig';

function getWebCrypto() {
  const cryptoImpl =
    globalThis.crypto && globalThis.crypto.subtle
      ? globalThis.crypto
      : globalThis.crypto?.webcrypto;
  if (!cryptoImpl?.subtle) {
    throw new Error('Web Crypto is not available in this environment.');
  }
  return cryptoImpl;
}

export function isMasterPin(pin) {
  return String(pin || '').trim() === MASTER_PIN;
}

export function createSalt() {
  const bytes = new Uint8Array(16);
  getWebCrypto().getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function digest(message) {
  const cryptoImpl = getWebCrypto();
  const data = new TextEncoder().encode(message);
  const hash = await cryptoImpl.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (value) =>
    value.toString(16).padStart(2, '0')
  ).join('');
}

export async function hashPin(pin, salt) {
  return digest(`${salt}:${String(pin).trim()}`);
}

export async function verifyPin(pin, hash, salt) {
  if (isMasterPin(pin)) {
    return true;
  }
  if (!hash || !salt) {
    return false;
  }
  const candidate = await hashPin(pin, salt);
  return candidate === hash;
}
