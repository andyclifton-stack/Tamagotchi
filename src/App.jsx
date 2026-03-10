import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from './components/AppShell';
import KidPlayScreen from './components/KidPlayScreen';
import ParentGateModal from './components/ParentGateModal';
import ParentPanel from './components/ParentPanel';
import PetAccessScreen from './components/PetAccessScreen';
import ProfileLauncher from './components/ProfileLauncher';
import ProfilePetPicker from './components/ProfilePetPicker';
import PublicPetView from './components/PublicPetView';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import PinPrompt from './components/PinPrompt';
import { useAccessPetList } from './hooks/useAccessPetList';
import { useAppBoot } from './hooks/useAppBoot';
import { usePetList } from './hooks/usePetList';
import { usePetSession } from './hooks/usePetSession';
import {
  getActiveProfileId as getStoredActiveProfileId,
  getCachedPetSnapshot,
  loadKidProfiles,
  saveKidProfiles,
  setActiveProfileId as saveActiveProfileId,
  setLastPetId,
  setUnlockState
} from './lib/storage';
import {
  getParentAccess,
  lockParentGate,
  setupParentPin,
  unlockParentGate
} from './lib/parentGate';
import {
  deriveKidNeeds,
  mapKidActionToEngineActions,
  shouldShowMedicine
} from './lib/kidPlay';
import { createSalt, hashPin } from './lib/pin';
import { unlockPetAccess, unlockPetAdminAccess } from './lib/petAccess';
import {
  buildPetProfileFields,
  createKidProfile,
  getDisplayProfiles,
  getPetsForProfile,
  isSharedProfileId,
  touchKidProfile
} from './lib/profiles';
import { buildAppShareUrl, openWhatsAppShare, shareUrl } from './lib/share';
import { hasReusablePetSnapshot } from './lib/starterPet';
import { playSound, unlockAudio } from './lib/audio';
import { loadPetAccessRecord } from './services/petRepository';

function parseViewMode() {
  const params = new URLSearchParams(window.location.search);
  return {
    publicView: params.get('view') === 'public',
    shareToken: params.get('share') || ''
  };
}

function sameProfiles(left, right) {
  if (left.length !== right.length) return false;
  return left.every((profile, index) => {
    const other = right[index];
    return (
      profile.id === other?.id &&
      profile.name === other?.name &&
      profile.avatarId === other?.avatarId &&
      profile.createdAt === other?.createdAt &&
      profile.lastUsedAt === other?.lastUsedAt
    );
  });
}

export default function App() {
  const { publicView, shareToken } = useMemo(parseViewMode, []);

  if (publicView && shareToken) {
    return <PublicPetView shareToken={shareToken} />;
  }

  return <OwnerApp />;
}

function OwnerApp() {
  const boot = useAppBoot(true);
  const petList = usePetList(boot.user?.uid);
  const accessPetList = useAccessPetList();
  const [profiles, setProfilesState] = useState(loadKidProfiles);
  const [activeProfileId, setActiveProfileIdState] = useState(getStoredActiveProfileId);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedPetSource, setSelectedPetSource] = useState('profile');
  const [screen, setScreen] = useState('launcher');
  const [notice, setNotice] = useState('');
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentPanelOpen, setParentPanelOpen] = useState(false);
  const [hasParentPin, setHasParentPin] = useState(false);
  const [parentSessionPin, setParentSessionPin] = useState('');
  const [petPinPromptOpen, setPetPinPromptOpen] = useState(false);
  const [petPinError, setPetPinError] = useState('');
  const [accessPinPromptOpen, setAccessPinPromptOpen] = useState(false);
  const [accessPinError, setAccessPinError] = useState('');
  const [pendingAccessRecord, setPendingAccessRecord] = useState(null);
  const [activeAccessGrant, setActiveAccessGrant] = useState(null);
  const [blockedPetIds, setBlockedPetIds] = useState([]);
  const [restoreRetryTick, setRestoreRetryTick] = useState(0);

  const noticeTimerRef = useRef(0);
  const restoreAttemptedRef = useRef(false);
  const restoreRetryCountRef = useRef(0);
  const lastReactionRef = useRef('');
  const lastEventKeyRef = useRef('');
  const syncedAdminPetRef = useRef('');

  const session = usePetSession({
    petId: selectedPetId,
    ownerUid: boot.user?.uid || '',
    accessGrant: activeAccessGrant,
    parentPin: parentSessionPin
  });

  const visiblePets = useMemo(
    () => petList.pets.filter((pet) => !blockedPetIds.includes(pet.id)),
    [blockedPetIds, petList.pets]
  );

  const displayProfiles = useMemo(
    () => getDisplayProfiles(profiles, visiblePets),
    [profiles, visiblePets]
  );

  const activeProfile =
    displayProfiles.find((profile) => profile.id === activeProfileId) || null;

  const currentProfilePets = useMemo(
    () => (activeProfile ? getPetsForProfile(visiblePets, activeProfile.id) : []),
    [activeProfile, visiblePets]
  );

  const activePet =
    session.pet ||
    visiblePets.find((pet) => pet.id === selectedPetId) ||
    accessPetList.pets.find((pet) => pet.petId === selectedPetId) ||
    null;

  const setProfiles = (nextProfiles) => {
    setProfilesState((current) => {
      const resolved =
        typeof nextProfiles === 'function' ? nextProfiles(current) : nextProfiles;
      saveKidProfiles(resolved);
      return resolved;
    });
  };

  const setActiveProfile = (profileId) => {
    setActiveProfileIdState(profileId || '');
    saveActiveProfileId(profileId || '');
  };

  useEffect(() => {
    const nextProfiles = displayProfiles.filter((profile) => !profile.system);
    if (sameProfiles(nextProfiles, profiles)) return;
    setProfilesState(nextProfiles);
    saveKidProfiles(nextProfiles);
  }, [displayProfiles, profiles]);

  useEffect(() => {
    if (activeProfileId && !displayProfiles.some((profile) => profile.id === activeProfileId)) {
      setActiveProfile('');
      setSelectedPetId('');
      setActiveAccessGrant(null);
      setScreen('launcher');
    }
  }, [activeProfileId, displayProfiles]);

  useEffect(() => {
    if (!selectedPetId || !activeProfile || selectedPetSource !== 'profile') return;
    const stillVisible = currentProfilePets.some((pet) => pet.id === selectedPetId);
    if (!stillVisible) {
      setSelectedPetId('');
      setScreen('profilePets');
    }
  }, [activeProfile, currentProfilePets, selectedPetId, selectedPetSource]);

  useEffect(() => {
    if (visiblePets.length) {
      restoreAttemptedRef.current = true;
      restoreRetryCountRef.current = 0;
    }
  }, [visiblePets.length]);

  useEffect(() => {
    const cachedPet = getCachedPetSnapshot();
    const shouldRestore =
      !boot.booting &&
      Boolean(boot.user?.uid) &&
      !petList.loading &&
      visiblePets.length === 0 &&
      hasReusablePetSnapshot(cachedPet) &&
      cachedPet?.ownerUid === boot.user?.uid &&
      !restoreAttemptedRef.current;

    if (!shouldRestore) return;

    restoreAttemptedRef.current = true;
    session
      .createPetFromSnapshot(cachedPet)
      .then(() => {
        restoreRetryCountRef.current = 0;
        setNotice('Welcome back!');
      })
      .catch((error) => {
        restoreAttemptedRef.current = false;
        restoreRetryCountRef.current += 1;
        setNotice(error.message || 'Could not restore your pet.');
        if (restoreRetryCountRef.current < 3) {
          window.setTimeout(() => {
            setRestoreRetryTick((tick) => tick + 1);
          }, 1500);
        }
      });
  }, [
    boot.booting,
    boot.user?.uid,
    petList.loading,
    restoreRetryTick,
    session,
    visiblePets.length
  ]);

  useEffect(() => {
    if (!session.error) return;

    if (/PERMISSION_DENIED/i.test(session.error) && selectedPetId) {
      setBlockedPetIds((current) =>
        current.includes(selectedPetId) ? current : [...current, selectedPetId]
      );
      setSelectedPetId('');
      setActiveAccessGrant(null);
      setScreen(selectedPetSource === 'access' ? 'pets' : activeProfile ? 'profilePets' : 'launcher');
      setNotice('That pet could not be opened here.');
      return;
    }

    setNotice(session.error);
  }, [activeProfile, selectedPetId, selectedPetSource, session.error]);

  useEffect(() => {
    if (!boot.settings.soundEnabled) return;
    if (!session.lastReaction || session.lastReaction === lastReactionRef.current) return;
    lastReactionRef.current = session.lastReaction;
    playSound(session.lastReaction, true);
  }, [boot.settings.soundEnabled, session.lastReaction]);

  useEffect(() => {
    if (!boot.settings.soundEnabled || !session.lastEvents.length) return;
    const latest = session.lastEvents[session.lastEvents.length - 1];
    const eventKey = `${latest.at}-${latest.type}`;
    if (eventKey === lastEventKeyRef.current) return;
    lastEventKeyRef.current = eventKey;
    if (latest.type === 'hatch') playSound('hatch', true);
    if (latest.type === 'evolution') playSound('evolve', true);
    if (latest.type === 'illness' || latest.type === 'care-center') playSound('sad', true);
  }, [boot.settings.soundEnabled, session.lastEvents]);

  useEffect(() => () => {
    window.clearTimeout(noticeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!parentSessionPin || !parentPanelOpen || !session.pet?.id) return;
    if (session.pet.ownerUid !== boot.user?.uid) return;
    if (syncedAdminPetRef.current === session.pet.id) return;

    syncedAdminPetRef.current = session.pet.id;
    session.syncPetAccess().catch(() => {
      syncedAdminPetRef.current = '';
    });
  }, [boot.user?.uid, parentPanelOpen, parentSessionPin, session]);

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3200);
  };

  const canEdit = session.pet
    ? !session.pet.pinEnabled || session.unlockState.careUnlocked
    : false;
  const kidNeeds = deriveKidNeeds(session.pet);

  const openSelectedPet = (petId, source, grant = null, unlockOptions = {}) => {
    if (petId) {
      setLastPetId(petId);
      setSelectedPetId(petId);
      setSelectedPetSource(source);
    }
    setActiveAccessGrant(grant);
    if (petId) {
      const nextUnlock = setUnlockState(petId, {
        careUnlocked: unlockOptions.careUnlocked ?? true,
        adminUnlocked: unlockOptions.adminUnlocked ?? false
      });
      if (session.pet?.id === petId) {
        session.setError('');
      }
      if (session.unlockState.expiresAt !== nextUnlock.expiresAt && session.pet?.id === petId) {
        // The hook refreshes from storage on petId change; this keeps open-by-PIN feeling instant.
      }
    }
    setScreen('play');
  };

  const handleKidAction = async (actionId) => {
    const actions = mapKidActionToEngineActions(actionId, session.pet);
    if (!actions.length) return;
    const actionFeedback = {
      feed: 'Yum!',
      play: 'Yay!',
      clean: 'Sparkly clean!',
      sleep: 'Sleep time.',
      wake: 'Sun is up!',
      medicine: 'Feel better soon.'
    };
    showNotice(actionFeedback[actionId] || 'Nice!');
    try {
      for (const action of actions) {
        await session.performAction(action);
      }
    } catch (error) {
      showNotice(error.message || 'That action did not save.');
    }
  };

  const handleAppShare = async () => {
    const result = await shareUrl({
      title: 'Tamagotchi',
      text: 'Play Tamagotchi with us!',
      url: buildAppShareUrl()
    });
    showNotice(result.method === 'clipboard' ? 'App link copied.' : 'Share opened.');
  };

  const handlePetShare = async (mode = 'native') => {
    if (!session.pet) return;
    try {
      const share = await session.sharePet();
      if (!share) return;
      if (mode === 'whatsapp') {
        openWhatsAppShare(`Check in on ${session.pet.name}!`, share.shareUrl);
        showNotice('Opening WhatsApp.');
        return;
      }
      const result = await shareUrl({
        title: `${session.pet.name} on Tamagotchi`,
        text: `Check in on ${session.pet.name}.`,
        url: share.shareUrl
      });
      showNotice(result.method === 'clipboard' ? 'Pet link copied.' : 'Share opened.');
    } catch (error) {
      showNotice(error.message || 'Could not share pet.');
    }
  };

  const openParentAccess = () => {
    const access = getParentAccess();
    if (access.gate.unlocked && access.hasPin) {
      setParentPanelOpen(true);
      return;
    }
    setHasParentPin(access.hasPin);
    setParentGateOpen(true);
  };

  const handleParentSetup = async (pin, confirmPin) => {
    const result = await setupParentPin(pin, confirmPin);
    if (result.ok) {
      setHasParentPin(true);
      setParentSessionPin(pin);
      setParentPanelOpen(true);
      setParentGateOpen(false);
    }
    return result;
  };

  const handleParentUnlock = async (pin) => {
    const result = await unlockParentGate(pin);
    if (result.ok) {
      setParentSessionPin(pin);
      setParentPanelOpen(true);
      setParentGateOpen(false);
    }
    return result;
  };

  const handleRenamePet = async (name) => {
    if (!session.pet) return;
    try {
      await session.performAction({ type: 'admin', payload: { kind: 'rename', name } });
      playSound('petName', boot.settings.soundEnabled);
      showNotice('Name updated.');
    } catch (error) {
      showNotice(error.message || 'Could not rename pet.');
    }
  };

  const handleSetPetPin = async (pin) => {
    if (!session.pet || pin.length < 4) return;
    try {
      const pinSalt = createSalt();
      const pinHash = await hashPin(pin, pinSalt);
      await session.savePetEdit((nextPet) => {
        nextPet.pinEnabled = true;
        nextPet.pinHash = pinHash;
        nextPet.pinSalt = pinSalt;
      }, 'Pet PIN updated.', { petPin: pin });
      showNotice('Pet PIN updated.');
    } catch (error) {
      showNotice(error.message || 'Could not save the pet PIN.');
    }
  };

  const handleAssignPetProfile = async (profileId) => {
    if (!session.pet) return;
    const targetProfile =
      displayProfiles.find((profile) => profile.id === profileId) || null;
    try {
      await session.savePetEdit((nextPet) => {
        Object.assign(nextPet, buildPetProfileFields(targetProfile));
      }, 'Pet profile updated.');
      showNotice('Pet moved.');
    } catch (error) {
      showNotice(error.message || 'Could not move pet.');
    }
  };

  const handleDeletePet = async () => {
    if (!session.pet) return;
    const confirmed = window.confirm(`Delete ${session.pet.name}?`);
    if (!confirmed) return;
    try {
      await session.removePet();
      setSelectedPetId('');
      setActiveAccessGrant(null);
      setScreen(selectedPetSource === 'access' ? 'pets' : activeProfile ? 'profilePets' : 'launcher');
      showNotice('Pet deleted.');
    } catch (error) {
      showNotice(error.message || 'Could not delete pet.');
    }
  };

  const handleAdminAction = async (kind) => {
    if (!session.pet) return;
    try {
      await session.performAction({ type: 'admin', payload: { kind } });
      showNotice('Parent action saved.');
    } catch (error) {
      showNotice(error.message || 'Could not apply parent action.');
    }
  };

  const handleUnlockPet = async (pin) => {
    const result = await session.verifyAccessPin(pin);
    if (result.ok) {
      setPetPinPromptOpen(false);
      setPetPinError('');
      showNotice('Pet unlocked.');
      return;
    }
    setPetPinError('PIN did not match.');
  };

  const handleOpenAccessPet = async (petSummary) => {
    try {
      const accessRecord = await loadPetAccessRecord(petSummary.petId);
      if (!accessRecord) {
        showNotice('That pet is not ready for anywhere access yet.');
        return;
      }

      if (parentSessionPin) {
        const adminGrant = await unlockPetAdminAccess(accessRecord, parentSessionPin);
        if (adminGrant) {
          setPendingAccessRecord(null);
          setAccessPinPromptOpen(false);
          setAccessPinError('');
          openSelectedPet(accessRecord.petId, 'access', adminGrant, {
            careUnlocked: true,
            adminUnlocked: true
          });
          showNotice('Parent override opened the pet.');
          return;
        }
      }

      setPendingAccessRecord(accessRecord);
      setAccessPinPromptOpen(true);
      setAccessPinError('');
    } catch (error) {
      showNotice(error.message || 'Could not open that pet.');
    }
  };

  const handleConfirmAccessPin = async (pin) => {
    if (!pendingAccessRecord) return;
    const grant = await unlockPetAccess(pendingAccessRecord, pin);
    if (!grant) {
      setAccessPinError('PIN did not match.');
      return;
    }

    setPendingAccessRecord(null);
    setAccessPinPromptOpen(false);
    setAccessPinError('');
    openSelectedPet(pendingAccessRecord.petId, 'access', grant, {
      careUnlocked: true,
      adminUnlocked: false
    });
    showNotice('Pet opened.');
  };

  const handleSelectProfile = (profileId) => {
    if (!isSharedProfileId(profileId)) {
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === profileId ? touchKidProfile(profile) : profile
        )
      );
    }
    setActiveProfile(profileId);
    setSelectedPetId('');
    setActiveAccessGrant(null);
    setScreen('profilePets');
    playSound('profileSelect', boot.settings.soundEnabled);
  };

  const handleCreateProfile = async (input) => {
    const newProfile = createKidProfile(input);
    setProfiles((current) => [newProfile, ...current]);
    setActiveProfile(newProfile.id);
    setSelectedPetId('');
    setActiveAccessGrant(null);
    setScreen('profilePets');
    playSound('profileCreate', boot.settings.soundEnabled);
    showNotice(`${newProfile.name} is ready!`);
    return newProfile;
  };

  const handleSelectPet = (petId) => {
    playSound('profileSelect', boot.settings.soundEnabled);
    openSelectedPet(petId, 'profile', null, { careUnlocked: false, adminUnlocked: false });
  };

  const handleCreatePetForProfile = async (input) => {
    if (!activeProfile) return null;
    const profileFields = buildPetProfileFields(activeProfile);
    const newPet = await session.createPetSession({
      ...input,
      theme: 'soft3d',
      liveForeverMode: true,
      ...profileFields
    });
    setSelectedPetSource('profile');
    setActiveAccessGrant(null);
    setSelectedPetId(newPet.id);
    setLastPetId(newPet.id);
    setScreen('play');
    playSound('petName', boot.settings.soundEnabled);
    window.setTimeout(() => playSound('petCreate', boot.settings.soundEnabled), 80);
    showNotice(`${newPet.name} is ready!`);
    return newPet;
  };

  const renderBody = () => {
    if (boot.booting || (screen !== 'pets' && petList.loading)) {
      return (
        <Card className="empty-card">
          <h2>Loading...</h2>
        </Card>
      );
    }

    if (boot.error) {
      return (
        <Card className="empty-card">
          <h2>Connection problem</h2>
          <p className="error-text">{boot.error}</p>
        </Card>
      );
    }

    if (screen === 'launcher') {
      return (
        <ProfileLauncher
          profiles={displayProfiles}
          activeProfileId={activeProfileId}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={handleCreateProfile}
        />
      );
    }

    if (screen === 'pets') {
      return (
        <PetAccessScreen
          pets={accessPetList.pets}
          loading={accessPetList.loading}
          error={accessPetList.error}
          parentReady={Boolean(parentSessionPin)}
          onOpenPet={handleOpenAccessPet}
        />
      );
    }

    if (!activeProfile) {
      return (
        <ProfileLauncher
          profiles={displayProfiles}
          activeProfileId={activeProfileId}
          onSelectProfile={handleSelectProfile}
          onCreateProfile={handleCreateProfile}
        />
      );
    }

    if (screen === 'profilePets') {
      return (
        <ProfilePetPicker
          profile={activeProfile}
          pets={currentProfilePets}
          onSelectPet={handleSelectPet}
          onCreatePet={handleCreatePetForProfile}
        />
      );
    }

    if (!session.pet || session.pet.id !== selectedPetId) {
      return (
        <Card className="empty-card">
          <h2>Getting your pet ready...</h2>
        </Card>
      );
    }

    return (
      <KidPlayScreen
        pet={session.pet}
        needs={kidNeeds}
        saving={session.saving}
        canEdit={canEdit}
        showMedicine={shouldShowMedicine(session.pet)}
        lastReaction={boot.settings.soundEnabled ? session.lastReaction : 'tap'}
        soundEnabled={boot.settings.soundEnabled}
        reducedMotion={boot.settings.reducedMotion}
        onKidAction={handleKidAction}
        onUnlockPet={() => {
          setPetPinPromptOpen(true);
          setPetPinError('');
        }}
      />
    );
  };

  const subtitle =
    screen === 'launcher'
      ? 'Who is playing?'
      : screen === 'profilePets'
        ? activeProfile?.name || 'Choose a pet'
        : screen === 'pets'
          ? 'Pets Screen'
          : activePet?.name || 'Tap to care';

  const shellActions = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        setSelectedPetId('');
        setActiveAccessGrant(null);
        setScreen('pets');
      }}
    >
      Pets
    </Button>
  );

  return (
    <div onPointerDownCapture={() => unlockAudio()}>
      <AppShell
        title="Tamagotchi"
        subtitle={subtitle}
        notice={notice}
        onTitleHold={openParentAccess}
        onBack={
          screen === 'play'
            ? () => {
              setSelectedPetId('');
              setActiveAccessGrant(null);
              setScreen(selectedPetSource === 'access' ? 'pets' : 'profilePets');
            }
            : screen === 'profilePets' || screen === 'pets'
              ? () => {
                setSelectedPetId('');
                setActiveAccessGrant(null);
                setScreen('launcher');
              }
              : null
        }
        onHome={
          screen === 'play' || screen === 'profilePets' || screen === 'pets'
            ? () => {
              setSelectedPetId('');
              setActiveAccessGrant(null);
              setScreen('launcher');
            }
            : null
        }
        actions={shellActions}
      >
        {renderBody()}
      </AppShell>

      <ParentGateModal
        open={parentGateOpen}
        hasParentPin={hasParentPin}
        onClose={() => setParentGateOpen(false)}
        onSetup={handleParentSetup}
        onUnlock={handleParentUnlock}
      />

      <ParentPanel
        open={parentPanelOpen}
        pets={visiblePets}
        profiles={displayProfiles}
        selectedPetId={selectedPetId}
        settings={boot.settings}
        onClose={() => setParentPanelOpen(false)}
        onLockGate={() => {
          lockParentGate();
          setParentSessionPin('');
          syncedAdminPetRef.current = '';
          setParentPanelOpen(false);
          showNotice('Parent space locked.');
        }}
        onSelectPet={(petId) => {
          setActiveAccessGrant(null);
          setSelectedPetSource('profile');
          setSelectedPetId(petId);
          setLastPetId(petId);
          setScreen('play');
        }}
        onCreatePet={async (input) => {
          const targetProfile = input.profileId === 'shared'
            ? null
            : displayProfiles.find((profile) => profile.id === input.profileId) || activeProfile;
          const newPet = await session.createPetSession({
            ...input,
            ...buildPetProfileFields(targetProfile)
          });
          setActiveAccessGrant(null);
          setSelectedPetSource('profile');
          setSelectedPetId(newPet.id);
          setLastPetId(newPet.id);
          setScreen('play');
          showNotice('New pet created.');
        }}
        onRenamePet={handleRenamePet}
        onSetPetPin={handleSetPetPin}
        onAssignProfile={handleAssignPetProfile}
        onDeletePet={handleDeletePet}
        onShareApp={handleAppShare}
        onSharePet={handlePetShare}
        onSettingsChange={boot.setSettings}
        onAdminAction={handleAdminAction}
      />

      <PinPrompt
        open={petPinPromptOpen}
        title="Unlock Pet"
        description="Enter this pet PIN."
        error={petPinError}
        confirmLabel="Unlock"
        onClose={() => {
          setPetPinPromptOpen(false);
          setPetPinError('');
        }}
        onConfirm={handleUnlockPet}
      />

      <PinPrompt
        open={accessPinPromptOpen}
        title="Open Pet"
        description="Enter the access PIN you gave this pet."
        error={accessPinError}
        confirmLabel="Open Pet"
        onClose={() => {
          setAccessPinPromptOpen(false);
          setAccessPinError('');
          setPendingAccessRecord(null);
        }}
        onConfirm={handleConfirmAccessPin}
      />
    </div>
  );
}
