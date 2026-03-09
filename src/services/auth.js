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

async function waitForAuthRestore() {
  if (typeof firebaseAuth.authStateReady === 'function') {
    try {
      await firebaseAuth.authStateReady();
      return;
    } catch (error) {
      // Fall back to the listener path below.
    }
  }

  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, () => {
      unsubscribe();
      resolve();
    });
  });
}

export async function ensureAnonymousUser() {
  await ensurePersistence();
  await waitForAuthRestore();
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
