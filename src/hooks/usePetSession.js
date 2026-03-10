import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createPetRecord,
  deletePet,
  ensurePublicShare,
  loadPet,
  savePetSimulation
} from '../services/petRepository';
import { createPet, createPetFromSnapshot } from '../game/createPet';
import { applyPetAction } from '../game/actions';
import { simulatePetState } from '../game/simulation';
import {
  clearCachedPetSnapshot,
  clearUnlockState,
  getUnlockState,
  saveCachedPetSnapshot,
  setLastPetId,
  setUnlockState
} from '../lib/storage';
import { isMasterPin, verifyPin } from '../lib/pin';
import { buildPetAccessRecord } from '../lib/petAccess';
import { getCurrentRefreshToken } from '../services/auth';

const SAVE_TICK_MS = 60 * 1000;

export function usePetSession({ petId, ownerUid, accessGrant, parentPin }) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastReaction, setLastReaction] = useState('tap');
  const [lastEvents, setLastEvents] = useState([]);
  const [unlockState, setUnlockStateState] = useState(() => getUnlockState(petId || ''));
  const intervalRef = useRef(null);
  const petPinRef = useRef('');

  useEffect(() => {
    setUnlockStateState(getUnlockState(petId || ''));
  }, [petId]);

  useEffect(() => {
    if (!petId) {
      petPinRef.current = '';
      return;
    }

    if (accessGrant?.petId === petId && accessGrant?.petPin) {
      petPinRef.current = accessGrant.petPin;
      return;
    }

    if (accessGrant?.petId !== petId) {
      petPinRef.current = '';
    }
  }, [accessGrant?.petId, accessGrant?.petPin, petId]);

  const getRemoteGrant = (targetPetId = petId) => {
    if (!accessGrant || accessGrant.petId !== targetPetId) {
      return null;
    }
    if (!accessGrant.ownerUid || accessGrant.ownerUid === ownerUid) {
      return null;
    }
    return accessGrant;
  };

  const buildSaveOptions = (targetPet, overrides = {}) => {
    const remoteGrant = getRemoteGrant(targetPet?.id);
    return {
      grant: remoteGrant,
      refreshToken: remoteGrant ? remoteGrant.refreshToken : getCurrentRefreshToken(),
      petPin: overrides.petPin ?? petPinRef.current,
      parentPin: overrides.parentPin ?? (parentPin || accessGrant?.parentPin || '')
    };
  };

  useEffect(() => {
    if (!petId) {
      setPet(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const remoteGrant = getRemoteGrant(petId);
    loadPet(petId, remoteGrant)
      .then(async (record) => {
        if (cancelled) return;
        if (!record) {
          setPet(null);
          setError('Pet not found.');
          setLoading(false);
          return;
        }
        const simulated = simulatePetState(record, Date.now());
        setPet(simulated.pet);
        saveCachedPetSnapshot(simulated.pet);
        setLastEvents(simulated.events);
        setError('');
        setLoading(false);
        setLastPetId(record.id);
        if (record.ownerUid === ownerUid || remoteGrant) {
          await savePetSimulation(simulated, buildSaveOptions(simulated.pet));
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message || 'Could not load the pet.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessGrant, ownerUid, parentPin, petId]);

  useEffect(() => {
    if (!pet?.id) {
      return undefined;
    }

    const remoteGrant = getRemoteGrant(pet.id);
    if (pet.ownerUid !== ownerUid && !remoteGrant) {
      return undefined;
    }

    intervalRef.current = window.setInterval(async () => {
      const simulated = simulatePetState(pet, Date.now());
      setPet(simulated.pet);
      setLastEvents(simulated.events);
      saveCachedPetSnapshot(simulated.pet);
      try {
        await savePetSimulation(simulated, buildSaveOptions(simulated.pet));
      } catch (saveError) {
        setError(saveError.message || 'Autosave failed.');
      }
    }, SAVE_TICK_MS);

    return () => {
      window.clearInterval(intervalRef.current);
    };
  }, [accessGrant, ownerUid, parentPin, pet, petId]);

  const createPetSession = async (input) => {
    setSaving(true);
    try {
      const newPet = await createPet(input, ownerUid, Date.now());
      const petPin = String(input.pin || '').trim();
      petPinRef.current = petPin;
      const accessRecord = petPin
        ? await buildPetAccessRecord(newPet, {
          refreshToken: getCurrentRefreshToken(),
          petPin,
          parentPin
        })
        : null;
      await createPetRecord(newPet, { accessRecord });
      setPet(newPet);
      saveCachedPetSnapshot(newPet);
      setLastPetId(newPet.id);
      const nextUnlockState = setUnlockState(newPet.id, {
        careUnlocked: true,
        adminUnlocked: false
      });
      setUnlockStateState(nextUnlockState);
      return newPet;
    } catch (createError) {
      setError(createError.message || 'Could not create the pet.');
      throw createError;
    } finally {
      setSaving(false);
    }
  };

  const performAction = async (action) => {
    if (!pet) return null;
    setSaving(true);
    try {
      const result = applyPetAction(pet, action, Date.now());
      setPet(result.pet);
      saveCachedPetSnapshot(result.pet);
      setLastEvents(result.events);
      setLastReaction(result.reaction);
      await savePetSimulation(result, buildSaveOptions(result.pet));
      return result.pet;
    } catch (actionError) {
      setError(actionError.message || 'Could not save that action.');
      throw actionError;
    } finally {
      setSaving(false);
    }
  };

  const savePetEdit = async (updater, eventMessage = 'Pet updated.', secretOverrides = {}) => {
    if (!pet) return null;
    setSaving(true);
    try {
      const nextPet = JSON.parse(JSON.stringify(pet));
      if (typeof updater === 'function') {
        updater(nextPet);
      }
      nextPet.updatedAt = Date.now();
      nextPet.lastPlayedAt = Date.now();
      const result = {
        pet: nextPet,
        events: [{ at: Date.now(), type: 'update', message: eventMessage }]
      };
      if (secretOverrides.petPin) {
        petPinRef.current = secretOverrides.petPin;
      }
      await savePetSimulation(result, buildSaveOptions(nextPet, secretOverrides));
      setPet(nextPet);
      saveCachedPetSnapshot(nextPet);
      return nextPet;
    } catch (saveError) {
      setError(saveError.message || 'Could not save that change.');
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const verifyAccessPin = async (pin) => {
    if (!pet) return { ok: false };
    if (!pet.pinEnabled) {
      const next = setUnlockState(pet.id, { careUnlocked: true, adminUnlocked: false });
      setUnlockStateState(next);
      return { ok: true, admin: false };
    }
    if (isMasterPin(pin)) {
      const next = setUnlockState(pet.id, { careUnlocked: true, adminUnlocked: true });
      setUnlockStateState(next);
      return { ok: true, admin: true };
    }
    const valid = await verifyPin(pin, pet.pinHash, pet.pinSalt);
    if (valid) {
      petPinRef.current = String(pin || '').trim();
      const next = setUnlockState(pet.id, { careUnlocked: true, adminUnlocked: false });
      setUnlockStateState(next);
      return { ok: true, admin: false };
    }
    return { ok: false, admin: false };
  };

  const unlockParentTools = async (pin) => {
    if (!pet) return { ok: false };
    if (!isMasterPin(pin)) {
      return { ok: false };
    }
    const next = setUnlockState(pet.id, { careUnlocked: true, adminUnlocked: true });
    setUnlockStateState(next);
    return { ok: true };
  };

  const lockPetSession = () => {
    if (!pet?.id) return;
    petPinRef.current = '';
    clearUnlockState(pet.id);
    setUnlockStateState({ careUnlocked: false, adminUnlocked: false, expiresAt: 0 });
  };

  const sharePet = async () => {
    if (!pet?.id) return null;
    try {
      const share = await ensurePublicShare(pet.id, {
        grant: getRemoteGrant(pet.id)
      });
      const refreshedPet = await loadPet(pet.id, getRemoteGrant(pet.id));
      if (refreshedPet) {
        setPet(refreshedPet);
        saveCachedPetSnapshot(refreshedPet);
      }
      return share;
    } catch (shareError) {
      setError(shareError.message || 'Could not create a share link.');
      throw shareError;
    }
  };

  const removePet = async () => {
    if (!pet?.id) return;
    try {
      await deletePet(pet.id, {
        grant: getRemoteGrant(pet.id)
      });
      clearCachedPetSnapshot();
      setPet(null);
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete the pet.');
      throw deleteError;
    }
  };

  const syncPetAccess = async () => {
    if (!pet) return null;
    const result = {
      pet: {
        ...pet,
        updatedAt: Date.now()
      },
      events: [{ at: Date.now(), type: 'update', message: 'Parent access synced.' }]
    };

    await savePetSimulation(result, buildSaveOptions(result.pet));
    setPet(result.pet);
    saveCachedPetSnapshot(result.pet);
    return result.pet;
  };

  return useMemo(
    () => ({
      pet,
      loading,
      saving,
      error,
      lastReaction,
      lastEvents,
      unlockState,
      createPetSession,
      performAction,
      verifyAccessPin,
      unlockParentTools,
      lockPetSession,
      sharePet,
      removePet,
      savePetEdit,
      syncPetAccess,
      setPet,
      setError,
      createPetFromSnapshot: async (snapshot) => {
        setSaving(true);
        try {
          const recreatedPet = createPetFromSnapshot(snapshot, ownerUid, Date.now());
          await createPetRecord(recreatedPet);
          setPet(recreatedPet);
          saveCachedPetSnapshot(recreatedPet);
          setLastPetId(recreatedPet.id);
          return recreatedPet;
        } catch (createError) {
          setError(createError.message || 'Could not restore the pet.');
          throw createError;
        } finally {
          setSaving(false);
        }
      }
    }),
    [
      pet,
      loading,
      saving,
      error,
      lastReaction,
      lastEvents,
      unlockState,
      ownerUid,
      accessGrant,
      parentPin
    ]
  );
}
