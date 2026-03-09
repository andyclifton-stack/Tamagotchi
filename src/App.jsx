import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from './components/AppShell';
import HomeScreen from './components/HomeScreen';
import CreatePetScreen from './components/CreatePetScreen';
import LoadPetsScreen from './components/LoadPetsScreen';
import SettingsScreen from './components/SettingsScreen';
import HelpScreen from './components/HelpScreen';
import PetScreen from './components/PetScreen';
import PublicPetView from './components/PublicPetView';
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import { useAppBoot } from './hooks/useAppBoot';
import { usePetList } from './hooks/usePetList';
import { usePetSession } from './hooks/usePetSession';
import { getLastPetId } from './lib/storage';
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
  const [screen, setScreen] = useState('home');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [notice, setNotice] = useState('');
  const lastReactionRef = useRef('');
  const lastEventKeyRef = useRef('');
  const noticeTimerRef = useRef(0);

  const session = usePetSession({
    petId: selectedPetId,
    ownerUid: boot.user?.uid || ''
  });

  useEffect(() => {
    if (!selectedPetId && petList.pets.length) {
      const restored = petList.pets.find((pet) => pet.id === getLastPetId());
      if (restored) {
        setSelectedPetId(restored.id);
      }
    }
  }, [petList.pets, selectedPetId]);

  useEffect(() => {
    if (session.error) {
      setNotice(session.error);
    }
  }, [session.error]);

  useEffect(() => {
    if (!boot.settings.soundEnabled) return;
    if (!session.lastReaction || session.lastReaction === lastReactionRef.current) return;
    lastReactionRef.current = session.lastReaction;
    playSound(session.lastReaction, boot.settings.soundEnabled);
  }, [session.lastReaction, boot.settings.soundEnabled]);

  useEffect(() => {
    if (!boot.settings.soundEnabled || !session.lastEvents.length) return;
    const latest = session.lastEvents[session.lastEvents.length - 1];
    const eventKey = `${latest.at}-${latest.type}`;
    if (eventKey === lastEventKeyRef.current) return;
    lastEventKeyRef.current = eventKey;
    if (latest.type === 'hatch') playSound('hatch', true);
    if (latest.type === 'evolution') playSound('evolve', true);
    if (latest.type === 'illness' || latest.type === 'care-center') playSound('sad', true);
  }, [session.lastEvents, boot.settings.soundEnabled]);

  useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const featuredPet =
    petList.pets.find((pet) => pet.id === selectedPetId) ||
    petList.pets[0] ||
    null;

  const canEdit = session.pet ? !session.pet.pinEnabled || session.unlockState.careUnlocked : false;
  const canAdmin = session.unlockState.adminUnlocked;

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), 3200);
  };

  const handleCreate = async (input) => {
    try {
      const newPet = await session.createPetSession(input);
      setSelectedPetId(newPet.id);
      setScreen('pet');
      showNotice(`${newPet.name} is ready to hatch.`);
    } catch (error) {
      showNotice(error.message || 'Could not create that pet.');
    }
  };

  const handleSelectPet = (petId) => {
    setSelectedPetId(petId);
    setScreen('pet');
  };

  const handleShareApp = async () => {
    const url = buildAppShareUrl();
    const result = await shareUrl({
      title: 'Tamagotchi',
      text: 'Care for a real-time virtual pet in Tamagotchi.',
      url
    });
    showNotice(result.method === 'clipboard' ? 'App link copied.' : 'App share opened.');
  };

  const handleSharePet = async (mode = 'native') => {
    if (!session.pet) return;
    try {
      const share = await session.sharePet();
      if (!share) return;
      if (mode === 'whatsapp') {
        openWhatsAppShare(`Check in on ${session.pet.name} in Tamagotchi.`, share.shareUrl);
        showNotice('Opening WhatsApp share.');
        return;
      }
      const result = await shareUrl({
        title: `${session.pet.name} on Tamagotchi`,
        text: `Check in on ${session.pet.name}'s live pet view.`,
        url: share.shareUrl
      });
      showNotice(result.method === 'clipboard' ? 'Pet link copied.' : 'Pet share opened.');
    } catch (error) {
      showNotice(error.message || 'Could not share that pet.');
    }
  };

  const handleThemeChange = async (themeId) => {
    try {
      await session.savePetEdit((draft) => {
        draft.theme = themeId;
      }, 'Theme updated.');
      showNotice('Theme updated.');
    } catch (error) {
      showNotice(error.message || 'Could not change the theme.');
    }
  };

  const handleDeletePet = async () => {
    if (!session.pet) return;
    const confirmed = window.confirm(`Delete ${session.pet.name}? This removes the pet and its share view.`);
    if (!confirmed) return;
    try {
      await session.removePet();
      setSelectedPetId('');
      setScreen('home');
      showNotice('Pet deleted.');
    } catch (error) {
      showNotice(error.message || 'Could not delete that pet.');
    }
  };

  const renderScreen = () => {
    if (boot.booting) {
      return (
        <Card className="empty-card">
          <h2>Connecting to Firebase...</h2>
          <p className="muted-text">Preparing your owner profile and pet saves.</p>
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

    if (screen === 'create') {
      return (
        <CreatePetScreen
          defaultTheme={boot.settings.defaultTheme}
          existingPets={petList.pets}
          saving={session.saving}
          onCancel={() => setScreen('home')}
          onCreate={handleCreate}
        />
      );
    }

    if (screen === 'load') {
      return (
        <LoadPetsScreen
          pets={petList.pets}
          loading={petList.loading}
          error={petList.error}
          onBack={() => setScreen('home')}
          onSelect={handleSelectPet}
        />
      );
    }

    if (screen === 'settings') {
      return (
        <SettingsScreen
          settings={boot.settings}
          onBack={() => setScreen('home')}
          onChange={boot.setSettings}
          onClearLocalCache={() => {
            boot.resetLocalData();
            showNotice('Local cache cleared.');
          }}
        />
      );
    }

    if (screen === 'help') {
      return <HelpScreen onBack={() => setScreen('home')} />;
    }

    if (screen === 'pet' && session.pet) {
      return (
        <PetScreen
          pet={session.pet}
          saving={session.saving}
          settings={boot.settings}
          lastReaction={session.lastReaction}
          events={session.lastEvents}
          canEdit={canEdit}
          canAdmin={canAdmin}
          onBack={() => setScreen('load')}
          onHome={() => setScreen('home')}
          onAction={session.performAction}
          onThemeChange={handleThemeChange}
          onSharePet={handleSharePet}
          onRequestUnlock={session.verifyAccessPin}
          onRequestParentUnlock={session.unlockParentTools}
          onLock={session.lockPetSession}
          onDeletePet={handleDeletePet}
        />
      );
    }

    return (
      <HomeScreen
        pets={petList.pets}
        featuredPet={featuredPet}
        onCreate={() => setScreen('create')}
        onLoad={() => setScreen('load')}
        onSettings={() => setScreen('settings')}
        onHelp={() => setScreen('help')}
        onShareApp={handleShareApp}
        onShareAppWhatsApp={() => openWhatsAppShare('Play Tamagotchi with me.', buildAppShareUrl())}
        onContinue={handleSelectPet}
      />
    );
  };

  return (
    <div onPointerDownCapture={() => unlockAudio()}>
      <AppShell
        title="Tamagotchi"
        subtitle="Mobile-first virtual pet"
        notice={notice}
        onHome={screen !== 'home' ? () => setScreen('home') : null}
        actions={
          null
        }
      >
        {renderScreen()}
      </AppShell>
    </div>
  );
}
