import { useEffect, useState } from 'react';
import Card from './ui/Card';
import PetScene from './PetScene';
import { formatStage } from '../lib/format';
import { HATCH_MS } from '../data/evolutionRules';
import { pickIdleEmote, pickPokeReaction } from '../lib/pokeReactions';
import { playSound } from '../lib/audio';

const NEED_ITEMS = [
  { id: 'hunger', label: 'Hungry', shortLabel: 'Food', tone: 'warm', icon: '🍎' },
  { id: 'happy', label: 'Happy', shortLabel: 'Fun', tone: 'joy', icon: '✨' },
  { id: 'energy', label: 'Energy', shortLabel: 'Rest', tone: 'cool', icon: '⚡' },
  { id: 'clean', label: 'Clean', shortLabel: 'Wash', tone: 'mint', icon: '🫧' }
];

function getCurrentTimePeriod(timestamp) {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 8) return 'Dawn';
  if (hour >= 8 && hour < 17) return 'Day';
  if (hour >= 17 && hour < 20) return 'Dusk';
  return 'Night';
}

function formatClock(timestamp) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(timestamp);
}

function getEggCountdown(pet, now) {
  const sinceCreated = Math.max(0, now - (pet.createdAt || now));
  const remaining = Math.max(0, HATCH_MS - sinceCreated);
  const minutes = Math.ceil(remaining / 60000);
  if (minutes <= 0) {
    return 'Hatching now';
  }
  return `Hatches in ${minutes} min`;
}

function NeedChip({ item, value }) {
  return (
    <div className="kid-need-chip">
      <div className="kid-need-chip__head">
        <span className="kid-need-chip__icon" aria-hidden="true">{item.icon}</span>
        <span>{item.shortLabel}</span>
        <strong>{Math.round(value)}%</strong>
      </div>
      <div className="kid-need-chip__track">
        <div
          className={`kid-need-chip__fill kid-need-chip__fill--${item.tone}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function KidPlayScreen({
  pet,
  needs,
  saving,
  canEdit,
  showMedicine,
  lastReaction,
  soundEnabled,
  reducedMotion,
  onKidAction,
  onUnlockPet
}) {
  const [now, setNow] = useState(() => Date.now());
  const [pokeReaction, setPokeReaction] = useState(null);
  const [reactionBubble, setReactionBubble] = useState(null);
  const [lastPokeAt, setLastPokeAt] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    setPokeReaction(null);
    setReactionBubble(null);
    setLastPokeAt(0);
  }, [pet?.id]);

  useEffect(() => {
    if (!reactionBubble) return undefined;
    const timerId = window.setTimeout(() => setReactionBubble(null), 1500);
    return () => window.clearTimeout(timerId);
  }, [reactionBubble]);

  useEffect(() => {
    if (!pokeReaction) return undefined;
    const timerId = window.setTimeout(() => setPokeReaction(null), 900);
    return () => window.clearTimeout(timerId);
  }, [pokeReaction]);

  useEffect(() => {
    if (!pet?.id) return undefined;

    const baseDelay = reducedMotion ? 22000 : 16000;
    const jitter = reducedMotion ? 8000 : 6000;
    const timerId = window.setTimeout(() => {
      if (document.hidden || saving || pet.status?.isSleeping) return;
      setReactionBubble({
        id: `idle-${Date.now()}`,
        text: pickIdleEmote(),
        kind: 'idle'
      });
    }, baseDelay + Math.round(Math.random() * jitter));

    return () => window.clearTimeout(timerId);
  }, [pet?.id, pet.status?.isSleeping, reducedMotion, saving, reactionBubble?.id]);

  if (!pet) {
    return (
      <Card className="empty-card">
        <h2>Getting your buddy ready...</h2>
      </Card>
    );
  }

  const manualDayMode = pet.status?.asleepUntil === -1 && !pet.status?.lightsOff;
  const timeLabel = pet.status?.isSleeping || pet.status?.lightsOff
    ? 'Night'
    : manualDayMode
      ? 'Day'
      : getCurrentTimePeriod(now);
  const clockLabel = formatClock(now);
  const eggCountdown = pet.currentStage === 'egg' ? getEggCountdown(pet, now) : '';
  const sceneReaction = pokeReaction?.animation || lastReaction;

  const handlePetPoke = () => {
    if (saving) return;
    const nextReaction = pickPokeReaction({
      now: Date.now(),
      lastReactionAt: lastPokeAt
    });
    if (!nextReaction) return;
    setLastPokeAt(nextReaction.at);
    setPokeReaction(nextReaction);
    setReactionBubble({
      id: `${nextReaction.id}-${nextReaction.at}`,
      text: nextReaction.bubbleText,
      kind: 'poke'
    });
    playSound(nextReaction.soundCue, soundEnabled);
  };

  return (
    <div className="kid-layout kid-layout--compact">
      <Card className="kid-pet-card kid-pet-card--play">
        <div className="kid-pet-card__head">
          <p className="eyebrow">{formatStage(pet.currentStage)}</p>
          <h2>{pet.name}</h2>
          <p className="kid-pet-card__meta">
            {timeLabel} - {clockLabel}{eggCountdown ? ` - ${eggCountdown}` : ''}
          </p>
        </div>

        <PetScene
          pet={pet}
          themeId="soft3d"
          reaction={sceneReaction}
          compact={false}
          interactive={canEdit && !saving}
          showMedicineTool={showMedicine}
          clockNow={now}
          reactionBubble={reactionBubble}
          reducedMotion={reducedMotion}
          onPetTap={handlePetPoke}
          onInteractionComplete={async (mode) => {
            await onKidAction(mode);
          }}
        />

        <div className="kid-needs-hud">
          {NEED_ITEMS.map((item) => (
            <NeedChip
              key={item.id}
              item={item}
              value={item.id === 'happy' ? needs.happy : needs[item.id]}
            />
          ))}
        </div>

        <p className="kid-mode-hint">
          Drag the tools to care. Tap your pet to get a cute reaction.
        </p>

        {!canEdit && pet.pinEnabled ? (
          <div className="kid-lock-card">
            <p>This pet is locked.</p>
            <button
              type="button"
              className="kid-mini-button"
              onClick={onUnlockPet}
            >
              Unlock
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
