import { get, onValue, push, ref, update } from 'firebase/database';
import { ROOT_PATH } from '../config/appConfig';
import { firebaseDatabase } from '../config/firebase';
import { toOwnerSummary, toPublicSnapshot } from '../game/publicSnapshot';
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

export async function createPetRecord(pet) {
  const updates = {};
  updates[petsPath(pet.id)] = pet;
  updates[`${ownerPetsPath(pet.ownerUid)}/${pet.id}`] = toOwnerSummary(pet);
  await update(rootRef(), updates);
  return pet;
}

export async function listOwnerPets(ownerUid) {
  const snapshot = await get(ref(firebaseDatabase, ownerPetsPath(ownerUid)));
  const value = snapshot.val() || {};
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

export async function loadPet(petId) {
  const snapshot = await get(ref(firebaseDatabase, petsPath(petId)));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function loadPublicPet(shareToken) {
  const snapshot = await get(ref(firebaseDatabase, publicPetsPath(shareToken)));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function savePetSimulation(result) {
  const { pet, events = [] } = result;
  const updates = {};
  updates[petsPath(pet.id)] = pet;
  updates[`${ownerPetsPath(pet.ownerUid)}/${pet.id}`] = result.summary || toOwnerSummary(pet);

  const publicSnapshot = result.publicSnapshot || toPublicSnapshot(pet);
  if (publicSnapshot && pet.share?.shareEnabled && pet.share?.shareToken) {
    updates[publicPetsPath(pet.share.shareToken)] = publicSnapshot;
  }

  Object.assign(updates, makeEventMap(pet.id, events));
  await update(rootRef(), updates);
  return pet;
}

export async function renamePet(petId, nextName) {
  const pet = await loadPet(petId);
  if (!pet) return null;
  pet.name = nextName.trim();
  pet.nameKey = pet.name.toLowerCase().replace(/\s+/g, '-');
  pet.updatedAt = Date.now();
  await savePetSimulation({
    pet,
    events: [{ at: Date.now(), type: 'admin', message: `Pet renamed to ${pet.name}.` }]
  });
  return pet;
}

export async function deletePet(petId) {
  const pet = await loadPet(petId);
  if (!pet) return;
  const updates = {};
  updates[petsPath(petId)] = null;
  updates[`${ownerPetsPath(pet.ownerUid)}/${petId}`] = null;
  updates[eventsPath(petId)] = null;
  if (pet.share?.shareToken) {
    updates[publicPetsPath(pet.share.shareToken)] = null;
  }
  await update(rootRef(), updates);
}

export async function ensurePublicShare(petId) {
  const pet = await loadPet(petId);
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

  await update(rootRef(), {
    [petsPath(pet.id)]: pet,
    [`${ownerPetsPath(pet.ownerUid)}/${pet.id}`]: toOwnerSummary(pet),
    [publicPetsPath(pet.share.shareToken)]: publicSnapshot
  });

  return {
    shareToken: pet.share.shareToken,
    shareUrl: buildPublicShareUrl(pet.share.shareToken)
  };
}

export async function setPublicShareEnabled(petId, enabled) {
  const pet = await loadPet(petId);
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

  await update(rootRef(), updates);
  return pet;
}
