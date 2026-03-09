import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously
} from 'firebase/auth';
import { firebaseAuth } from '../config/firebase';

let persistenceReady = false;

async function ensurePersistence() {
  if (persistenceReady) return;
  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
  } catch (error) {
    // Fallback to default persistence if the browser rejects explicit local persistence.
  }
  persistenceReady = true;
}

export async function ensureAnonymousUser() {
  await ensurePersistence();
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }
  const credential = await signInAnonymously(firebaseAuth);
  return credential.user;
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export function getCurrentUid() {
  return firebaseAuth.currentUser?.uid || '';
}
