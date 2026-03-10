import { get, onValue, push, ref, update } from 'firebase/database';
import { ROOT_PATH } from '../config/appConfig';
import { firebaseConfig, firebaseDatabase } from '../config/firebase';
import { toOwnerSummary, toPublicSnapshot } from '../game/publicSnapshot';
import {
  buildPetAccessKey,
  buildPetAccessRecord,
  isPetAccessRecord,
  toPetAccessSummary
} from '../lib/petAccess';
import { buildPublicShareUrl } from '../lib/share';

function rootRef() {
  return ref(firebaseDatabase);
}

function petsPath(petId) {
  return `${ROOT_PATH}/pets/${petId}`;
}

function ownerPetsPath(ownerUid) {
  return `${ROOT_PATH}/ownerPets/${ownerUid}`;
}

function publicPetsPath(token) {
  return `${ROOT_PATH}/publicPets/${token}`;
}

function accessPetPath(petId) {
  return publicPetsPath(buildPetAccessKey(petId));
}

function eventsPath(petId) {
  return `${ROOT_PATH}/events/${petId}`;
}

function makeEventMap(petId, events) {
  const updates = {};
  const limitedEvents = events.slice(-8);
  limitedEvents.forEach((event) => {
    const eventRef = push(ref(firebaseDatabase, eventsPath(petId)));
    updates[`${eventsPath(petId)}/${eventRef.key}`] = event;
  });
  return updates;
}

async function refreshGrantIdToken(grant) {
  if (!grant?.refreshToken) {
    throw new Error('Missing pet access credentials.');
  }

  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: grant.refreshToken
      })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Could not unlock that pet.');
  }

  grant.idToken = payload.id_token;
  grant.ownerUid = payload.user_id || grant.ownerUid || '';
  grant.expiresAt = Date.now() + (Number(payload.expires_in || 3600) * 1000);
  return grant.idToken;
}

async function getGrantIdToken(grant) {
  if (!grant) return '';
  if (grant.idToken && grant.expiresAt && grant.expiresAt > Date.now() + 60000) {
    return grant.idToken;
  }
  return refreshGrantIdToken(grant);
}

async function readJson(path, grant = null) {
  if (!grant) {
    const snapshot = await get(ref(firebaseDatabase, path));
    return snapshot.exists() ? snapshot.val() : null;
  }

  const idToken = await getGrantIdToken(grant);
  const url = new URL(`${firebaseConfig.databaseURL}/${path}.json`);
  url.searchParams.set('auth', idToken);
  const response = await fetch(url.toString());
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Could not load the pet.');
  }
  return payload || null;
}

async function applyUpdates(updates, grant = null) {
  if (!grant) {
    await update(rootRef(), updates);
    return;
  }

  const idToken = await getGrantIdToken(grant);

  for (const [path, value] of Object.entries(updates)) {
    const url = new URL(`${firebaseConfig.databaseURL}/${path}.json`);
    url.searchParams.set('auth', idToken);
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'Could not save the pet.');
    }
  }
}

export async function createPetRecord(pet, options = {}) {
  const updates = {};
  updates[petsPath(pet.id)] = pet;
  updates[`${ownerPetsPath(pet.ownerUid)}/${pet.id}`] = toOwnerSummary(pet);
  if (options.accessRecord) {
    updates[accessPetPath(pet.id)] = options.accessRecord;
  }
  await applyUpdates(updates, options.grant || null);
  return pet;
}

export async function listOwnerPets(ownerUid, grant = null) {
  const value = (await readJson(ownerPetsPath(ownerUid), grant)) || {};
  return Object.values(value).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function subscribeOwnerPets(ownerUid, callback, onError) {
  const ownerRef = ref(firebaseDatabase, ownerPetsPath(ownerUid));
  return onValue(
    ownerRef,
    (snapshot) => {
      const value = snapshot.val() || {};
      const items = Object.values(value).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      callback(items);
    },
    onError
  );
}

export function subscribeAccessPets(callback, onError) {
  const accessRef = ref(firebaseDatabase, `${ROOT_PATH}/publicPets`);
  return onValue(
    accessRef,
    (snapshot) => {
      const value = snapshot.val() || {};
      const items = Object.values(value)
        .filter((record) => isPetAccessRecord(record) && record.pinEnabled)
        .map((record) => toPetAccessSummary(record))
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      callback(items);
    },
    onError
  );
}

export async function loadPet(petId, grant = null) {
  return readJson(petsPath(petId), grant);
}

export async function loadPublicPet(shareToken) {
  const snapshot = await get(ref(firebaseDatabase, publicPetsPath(shareToken)));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function loadPetAccessRecord(petId) {
  return readJson(accessPetPath(petId));
}

export async function savePetSimulation(result, options = {}) {
  const { pet, events = [] } = result;
  const updates = {};
  updates[petsPath(pet.id)] = pet;
  updates[`${ownerPetsPath(pet.ownerUid)}/${pet.id}`] = result.summary || toOwnerSummary(pet);

  const publicSnapshot = result.publicSnapshot || toPublicSnapshot(pet);
  if (publicSnapshot && pet.share?.shareEnabled && pet.share?.shareToken) {
    updates[publicPetsPath(pet.share.shareToken)] = publicSnapshot;
  }

  if (pet.pinEnabled) {
    const existingAccessRecord = await loadPetAccessRecord(pet.id);
    const accessRecord = await buildPetAccessRecord(pet, {
      existingRecord: existingAccessRecord,
      refreshToken: options.refreshToken || '',
      petPin: options.petPin || '',
      parentPin: options.parentPin || ''
    });
    if (accessRecord) {
      updates[accessPetPath(pet.id)] = accessRecord;
    }
  } else {
    updates[accessPetPath(pet.id)] = null;
  }

  Object.assign(updates, makeEventMap(pet.id, events));
  await applyUpdates(updates, options.grant || null);
  return pet;
}

export async function renamePet(petId, nextName, options = {}) {
  const pet = await loadPet(petId, options.grant || null);
  if (!pet) return null;
  pet.name = nextName.trim();
  pet.nameKey = pet.name.toLowerCase().replace(/\s+/g, '-');
  pet.updatedAt = Date.now();
  await savePetSimulation({
    pet,
    events: [{ at: Date.now(), type: 'admin', message: `Pet renamed to ${pet.name}.` }]
  }, options);
  return pet;
}

export async function deletePet(petId, options = {}) {
  const pet = await loadPet(petId, options.grant || null);
  if (!pet) return;
  const updates = {};
  updates[petsPath(petId)] = null;
  updates[`${ownerPetsPath(pet.ownerUid)}/${petId}`] = null;
  updates[eventsPath(petId)] = null;
  updates[accessPetPath(petId)] = null;
  if (pet.share?.shareToken) {
    updates[publicPetsPath(pet.share.shareToken)] = null;
  }
  await applyUpdates(updates, options.grant || null);
}

export async function ensurePublicShare(petId, options = {}) {
  const pet = await loadPet(petId, options.grant || null);
  if (!pet) {
    throw new Error('Pet not found.');
  }

  if (!pet.share?.shareToken) {
    pet.share = {
      ...pet.share,
      shareToken: Math.random().toString(36).slice(2, 10),
      shareEnabled: true,
      sharedAt: Date.now()
    };
  } else {
    pet.share.shareEnabled = true;
    pet.share.sharedAt = pet.share.sharedAt || Date.now();
  }

  pet.updatedAt = Date.now();
  const publicSnapshot = toPublicSnapshot(pet);

  await applyUpdates({
    [petsPath(pet.id)]: pet,
    [`${ownerPetsPath(pet.ownerUid)}/${pet.id}`]: toOwnerSummary(pet),
    [publicPetsPath(pet.share.shareToken)]: publicSnapshot
  }, options.grant || null);

  return {
    shareToken: pet.share.shareToken,
    shareUrl: buildPublicShareUrl(pet.share.shareToken)
  };
}

export async function setPublicShareEnabled(petId, enabled, options = {}) {
  const pet = await loadPet(petId, options.grant || null);
  if (!pet) return null;
  pet.share = pet.share || {};
  pet.share.shareEnabled = enabled;
  pet.updatedAt = Date.now();

  const updates = {
    [petsPath(pet.id)]: pet,
    [`${ownerPetsPath(pet.ownerUid)}/${pet.id}`]: toOwnerSummary(pet)
  };

  if (enabled && pet.share.shareToken) {
    updates[publicPetsPath(pet.share.shareToken)] = toPublicSnapshot(pet);
  } else if (pet.share.shareToken) {
    updates[publicPetsPath(pet.share.shareToken)] = null;
  }

  await applyUpdates(updates, options.grant || null);
  return pet;
}
