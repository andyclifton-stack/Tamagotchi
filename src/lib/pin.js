import { MASTER_PIN } from '../config/appConfig';

const PBKDF2_ITERATIONS = 40000;

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
  if (!hash || !salt) {
    return false;
  }
  const candidate = await hashPin(pin, salt);
  return candidate === hash;
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveSecretKey(pin, salt) {
  const cryptoImpl = getWebCrypto();
  const baseKey = await cryptoImpl.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(pin || '').trim()),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return cryptoImpl.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSecretWithPin(secret, pin) {
  const normalizedPin = String(pin || '').trim();
  const normalizedSecret = String(secret || '');

  if (!normalizedPin || !normalizedSecret) {
    return null;
  }

  const cryptoImpl = getWebCrypto();
  const salt = createSalt();
  const iv = new Uint8Array(12);
  cryptoImpl.getRandomValues(iv);
  const key = await deriveSecretKey(normalizedPin, salt);
  const cipherBuffer = await cryptoImpl.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    new TextEncoder().encode(normalizedSecret)
  );

  return {
    version: 1,
    salt,
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(new Uint8Array(cipherBuffer))
  };
}

export async function decryptSecretWithPin(secretRecord, pin) {
  if (!secretRecord?.salt || !secretRecord?.iv || !secretRecord?.cipher) {
    return '';
  }

  try {
    const key = await deriveSecretKey(String(pin || '').trim(), secretRecord.salt);
    const decrypted = await getWebCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(secretRecord.iv)
      },
      key,
      base64ToBytes(secretRecord.cipher)
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    return '';
  }
}
