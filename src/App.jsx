import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from './components/AppShell';
import KidPlayScreen from './components/KidPlayScreen';
import ParentGateModal from './components/ParentGateModal';
import ParentPanel from './components/ParentPanel';
import PublicPetView from './components/PublicPetView';
import Card from './components/ui/Card';
import PinPrompt from './components/PinPrompt';
import { useAppBoot } from './hooks/useAppBoot';
import { usePetList } from './hooks/usePetList';
import { usePetSession } from './hooks/usePetSession';
import { getLastPetId, setLastPetId } from './lib/storage';
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
import { buildStarterPetInput, shouldAutoCreateStarter } from './lib/starterPet';
import { buildAppShareUrl, openWhatsAppShare, shareUrl } from './lib/share';
import { playSound, unlockAudio } from './lib/audio';

function parseViewMode() {
  const params = new URLSearchParams(window.location.search);
  return {
    publicView: params.get('view') === 'public',
    shareToken: params.get('share') || ''
  };
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
  const [selectedPetId, setSelectedPetId] = useState('');
  const [notice, setNotice] = useState('');
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentPanelOpen, setParentPanelOpen] = useState(false);
  const [hasParentPin, setHasParentPin] = useState(false);
  const [petPinPromptOpen, setPetPinPromptOpen] = useState(false);
  const [petPinError, setPetPinError] = useState('');
  const [blockedPetIds, setBlockedPetIds] = useState([]);
  const [starterRetryTick, setStarterRetryTick] = useState(0);

  const noticeTimerRef = useRef(0);
  const starterDoneRef = useRef(false);
  const starterCreatingRef = useRef(false);
  const starterRetryCountRef = useRef(0);
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

  const activePet =
    visiblePets.find((pet) => pet.id === selectedPetId) || visiblePets[0] || null;

  useEffect(() => {
    if (!selectedPetId && visiblePets.length) {
      const restored = visiblePets.find((pet) => pet.id === getLastPetId());
      setSelectedPetId(restored ? restored.id : visiblePets[0].id);
    }
  }, [selectedPetId, visiblePets]);

  useEffect(() => {
    if (selectedPetId && visiblePets.length) {
      const exists = visiblePets.some((pet) => pet.id === selectedPetId);
      if (!exists) {
        setSelectedPetId(visiblePets[0].id);
      }
    }
  }, [selectedPetId, visiblePets]);

  useEffect(() => {
    if (visiblePets.length) {
      starterDoneRef.current = true;
      starterCreatingRef.current = false;
      starterRetryCountRef.current = 0;
    }
  }, [visiblePets.length]);

  useEffect(() => {
    const shouldCreate = shouldAutoCreateStarter({
      booting: boot.booting,
      ownerUid: boot.user?.uid,
      petListLoading: petList.loading,
      petCount: visiblePets.length,
      starterCreated: starterDoneRef.current || starterCreatingRef.current
    });
    if (!shouldCreate) return;

    starterCreatingRef.current = true;
    session
      .createPetSession(buildStarterPetInput())
      .then((pet) => {
        starterCreatingRef.current = false;
        starterDoneRef.current = true;
        starterRetryCountRef.current = 0;
        setSelectedPetId(pet.id);
        setLastPetId(pet.id);
        setNotice('Your buddy is ready!');
      })
      .catch((error) => {
        starterCreatingRef.current = false;
        starterRetryCountRef.current += 1;
        setNotice(error.message || 'Could not create starter pet.');
        if (starterRetryCountRef.current < 4) {
          window.setTimeout(() => {
            setStarterRetryTick((tick) => tick + 1);
          }, 1500);
        }
      });
  }, [
    boot.booting,
    boot.user?.uid,
    petList.loading,
    starterRetryTick,
    visiblePets.length
  ]);

  useEffect(() => {
    if (!session.error) return;

    if (/PERMISSION_DENIED/i.test(session.error) && selectedPetId) {
      setBlockedPetIds((current) =>
        current.includes(selectedPetId) ? current : [...current, selectedPetId]
      );
      setSelectedPetId('');
      setNotice('One saved pet could not be opened. Trying another pet.');
      return;
    }

    setNotice(session.error);
  }, [selectedPetId, session.error]);

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
      showNotice('Name updated.');
    } catch (error) {
      showNotice(error.message || 'Could not rename pet.');
    }
  };

  const handleDeletePet = async () => {
    if (!session.pet) return;
    const confirmed = window.confirm(`Delete ${session.pet.name}?`);
    if (!confirmed) return;
    try {
      await session.removePet();
      setSelectedPetId('');
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

  const renderBody = () => {
    if (boot.booting) {
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

    if (
      petList.loading ||
      !activePet ||
      !session.pet ||
      session.pet.id !== activePet.id
    ) {
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
        onKidAction={handleKidAction}
        onUnlockPet={() => {
          setPetPinPromptOpen(true);
          setPetPinError('');
        }}
      />
    );
  };

  return (
    <div onPointerDownCapture={() => unlockAudio()}>
      <AppShell
        title="Tamagotchi"
        subtitle="Tap to care"
        notice={notice}
        onTitleHold={openParentAccess}
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
        }}
        onCreatePet={async (input) => {
          const newPet = await session.createPetSession(input);
          setSelectedPetId(newPet.id);
          setLastPetId(newPet.id);
          showNotice('New pet created.');
        }}
        onRenamePet={handleRenamePet}
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
