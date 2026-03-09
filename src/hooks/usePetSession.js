import { useEffect, useMemo, useRef, useState } from 'react';
import { createPetRecord, deletePet, ensurePublicShare, loadPet, savePetSimulation } from '../services/petRepository';
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

const SAVE_TICK_MS = 60 * 1000;

export function usePetSession({ petId, ownerUid }) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastReaction, setLastReaction] = useState('tap');
  const [lastEvents, setLastEvents] = useState([]);
  const [unlockState, setUnlockStateState] = useState(() => getUnlockState(petId || ''));
  const intervalRef = useRef(null);

  useEffect(() => {
    setUnlockStateState(getUnlockState(petId || ''));
  }, [petId]);

  useEffect(() => {
    if (!petId) {
      setPet(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    loadPet(petId)
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
        if (record.ownerUid === ownerUid) {
          await savePetSimulation(simulated);
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
  }, [petId, ownerUid]);

  useEffect(() => {
    if (!pet?.id || pet.ownerUid !== ownerUid) {
      return undefined;
    }

    intervalRef.current = window.setInterval(async () => {
      const simulated = simulatePetState(pet, Date.now());
      setPet(simulated.pet);
      setLastEvents(simulated.events);
      saveCachedPetSnapshot(simulated.pet);
      try {
        await savePetSimulation(simulated);
      } catch (saveError) {
        setError(saveError.message || 'Autosave failed.');
      }
    }, SAVE_TICK_MS);

    return () => {
      window.clearInterval(intervalRef.current);
    };
  }, [pet, ownerUid]);

  const createPetSession = async (input) => {
    setSaving(true);
    try {
      const newPet = await createPet(input, ownerUid, Date.now());
      await createPetRecord(newPet);
      setPet(newPet);
      saveCachedPetSnapshot(newPet);
      setLastPetId(newPet.id);
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
      await savePetSimulation(result);
      return result.pet;
    } catch (actionError) {
      setError(actionError.message || 'Could not save that action.');
      throw actionError;
    } finally {
      setSaving(false);
    }
  };

  const savePetEdit = async (updater, eventMessage = 'Pet updated.') => {
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
      await savePetSimulation(result);
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
    clearUnlockState(pet.id);
    setUnlockStateState({ careUnlocked: false, adminUnlocked: false, expiresAt: 0 });
  };

  const sharePet = async () => {
    if (!pet?.id) return null;
    try {
      const share = await ensurePublicShare(pet.id);
      const refreshedPet = await loadPet(pet.id);
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
      await deletePet(pet.id);
      clearCachedPetSnapshot();
      setPet(null);
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete the pet.');
      throw deleteError;
    }
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
      ownerUid
    ]
  );
}
