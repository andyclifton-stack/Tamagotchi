import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from './components/AppShell';
import KidPlayScreen from './components/KidPlayScreen';
import ParentGateModal from './components/ParentGateModal';
import ParentPanel from './components/ParentPanel';
import ProfileLauncher from './components/ProfileLauncher';
import ProfilePetPicker from './components/ProfilePetPicker';
import PublicPetView from './components/PublicPetView';
import Card from './components/ui/Card';
import PinPrompt from './components/PinPrompt';
import { useAppBoot } from './hooks/useAppBoot';
import { usePetList } from './hooks/usePetList';
import { usePetSession } from './hooks/usePetSession';
import {
  getActiveProfileId as getStoredActiveProfileId,
  getCachedPetSnapshot,
  loadKidProfiles,
  saveKidProfiles,
  setActiveProfileId as saveActiveProfileId,
  setLastPetId
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
import { hasReusablePetSnapshot } from './lib/starterPet';
import { buildAppShareUrl, openWhatsAppShare, shareUrl } from './lib/share';
import { playSound, unlockAudio } from './lib/audio';
import {
  buildPetProfileFields,
  createKidProfile,
  getDisplayProfiles,
  getPetsForProfile,
  isSharedProfileId,
  touchKidProfile
} from './lib/profiles';

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
  const [profiles, setProfilesState] = useState(loadKidProfiles);
  const [activeProfileId, setActiveProfileIdState] = useState(getStoredActiveProfileId);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [screen, setScreen] = useState('launcher');
  const [notice, setNotice] = useState('');
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentPanelOpen, setParentPanelOpen] = useState(false);
  const [hasParentPin, setHasParentPin] = useState(false);
  const [petPinPromptOpen, setPetPinPromptOpen] = useState(false);
  const [petPinError, setPetPinError] = useState('');
  const [blockedPetIds, setBlockedPetIds] = useState([]);
  const [restoreRetryTick, setRestoreRetryTick] = useState(0);

  const noticeTimerRef = useRef(0);
  const restoreAttemptedRef = useRef(false);
  const restoreRetryCountRef = useRef(0);
  const lastReactionRef = useRef('');
  const lastEventKeyRef = useRef('');

  const session = usePetSession({
    petId: selectedPetId,
    ownerUid: boot.user?.uid || ''
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
    visiblePets.find((pet) => pet.id === selectedPetId) || null;

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
      setScreen('launcher');
    }
  }, [activeProfileId, displayProfiles]);

  useEffect(() => {
    if (!selectedPetId || !activeProfile) return;
    const stillVisible = currentProfilePets.some((pet) => pet.id === selectedPetId);
    if (!stillVisible) {
      setSelectedPetId('');
      setScreen('profilePets');
    }
  }, [activeProfile, currentProfilePets, selectedPetId]);

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
      setScreen(activeProfile ? 'profilePets' : 'launcher');
      setNotice('That pet could not be opened on this device.');
      return;
    }

    setNotice(session.error);
  }, [activeProfile, selectedPetId, session.error]);

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

  useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3200);
  };

  const canEdit = session.pet
    ? !session.pet.pinEnabled || session.unlockState.careUnlocked
    : false;
  const kidNeeds = deriveKidNeeds(session.pet);

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
      setParentPanelOpen(true);
    }
    return result;
  };

  const handleParentUnlock = async (pin) => {
    const result = await unlockParentGate(pin);
    if (result.ok) {
      setParentPanelOpen(true);
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
      setScreen(activeProfile ? 'profilePets' : 'launcher');
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
    setScreen('profilePets');
    playSound('profileSelect', boot.settings.soundEnabled);
  };

  const handleCreateProfile = async (input) => {
    const newProfile = createKidProfile(input);
    setProfiles((current) => [newProfile, ...current]);
    setActiveProfile(newProfile.id);
    setSelectedPetId('');
    setScreen('profilePets');
    playSound('profileCreate', boot.settings.soundEnabled);
    showNotice(`${newProfile.name} is ready!`);
    return newProfile;
  };

  const handleSelectPet = (petId) => {
    setSelectedPetId(petId);
    setLastPetId(petId);
    setScreen('play');
    playSound('profileSelect', boot.settings.soundEnabled);
  };

  const handleCreatePetForProfile = async (input) => {
    if (!activeProfile) return null;
    const profileFields = buildPetProfileFields(activeProfile);
    const newPet = await session.createPetSession({
      ...input,
      theme: 'soft3d',
      liveForeverMode: true,
      pin: '',
      ...profileFields
    });
    setSelectedPetId(newPet.id);
    setLastPetId(newPet.id);
    setScreen('play');
    playSound('petName', boot.settings.soundEnabled);
    window.setTimeout(() => playSound('petCreate', boot.settings.soundEnabled), 80);
    showNotice(`${newPet.name} is ready!`);
    return newPet;
  };

  const renderBody = () => {
    if (boot.booting || petList.loading) {
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

    if (!activePet || !session.pet || session.pet.id !== activePet.id) {
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
        : 'Tap to care';

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
              setScreen('profilePets');
            }
            : screen === 'profilePets'
              ? () => setScreen('launcher')
              : null
        }
        onHome={
          screen === 'play' || screen === 'profilePets'
            ? () => {
              setSelectedPetId('');
              setScreen('launcher');
            }
            : null
        }
        actions={null}
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
          setParentPanelOpen(false);
          showNotice('Parent space locked.');
        }}
        onSelectPet={(petId) => {
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
          setSelectedPetId(newPet.id);
          setLastPetId(newPet.id);
          setScreen('play');
          showNotice('New pet created.');
        }}
        onRenamePet={handleRenamePet}
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
    </div>
  );
}
