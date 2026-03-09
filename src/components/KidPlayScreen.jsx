import { useEffect, useState } from 'react';
import Card from './ui/Card';
import PetScene from './PetScene';
import { formatStage } from '../lib/format';
import { HATCH_MS } from '../data/evolutionRules';

function toTitleCase(value) {
  if (!value) return 'Day';
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function NeedBar({ label, value, tone }) {
  return (
    <div className="kid-need">
      <div className="kid-need__head">
        <span>{label}</span>
        <strong>{Math.round(value)}%</strong>
      </div>
      <div className="kid-need__track">
        <div
          className={`kid-need__fill kid-need__fill--${tone}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function ActionButton({ icon, label, disabled, onClick }) {
  return (
    <button
      type="button"
      className="kid-action"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="kid-action__emoji" aria-hidden="true">
        {icon}
      </span>
      <span className="kid-action__label">{label}</span>
    </button>
  );
}

export default function KidPlayScreen({
  pet,
  needs,
  saving,
  canEdit,
  showMedicine,
  lastReaction,
  onKidAction,
  onUnlockPet
}) {
  const [now, setNow] = useState(() => Date.now());
  const [interactionMode, setInteractionMode] = useState('');
  const [interactionProgress, setInteractionProgress] = useState(0);
  const modeActive = Boolean(interactionMode);
  const isMode = (mode) => interactionMode === mode;

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    setInteractionMode('');
    setInteractionProgress(0);
  }, [pet?.id]);

  if (!pet) {
    return (
      <Card className="empty-card">
        <h2>Getting your buddy ready...</h2>
      </Card>
    );
  }

  return (
    <div className="kid-layout">
      <Card className="kid-pet-card">
        <div className="kid-pet-card__head">
          <p className="eyebrow">{formatStage(pet.currentStage)}</p>
          <h2>{pet.name}</h2>
          <p className="kid-pet-card__meta">
            {toTitleCase(pet.timeOfDay)} {pet.currentStage === 'egg' ? `- ${getEggCountdown(pet, now)}` : ''}
          </p>
        </div>
        <PetScene
          pet={pet}
          themeId="soft3d"
          reaction={lastReaction}
          compact={false}
          interactionMode={interactionMode}
          interactionProgress={interactionProgress}
          onInteractionProgress={setInteractionProgress}
          onInteractionComplete={async (mode) => {
            setInteractionMode('');
            setInteractionProgress(0);
            await onKidAction(mode);
          }}
        />

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

      <Card className="kid-needs-card">
        <div className="kid-needs-grid">
          <NeedBar label="Hunger" value={needs.hunger} tone="warm" />
          <NeedBar label="Happy" value={needs.happy} tone="joy" />
          <NeedBar label="Energy" value={needs.energy} tone="cool" />
          <NeedBar label="Clean" value={needs.clean} tone="mint" />
        </div>
      </Card>

      <Card className="kid-actions-card">
        {interactionMode === 'clean' ? (
          <p className="kid-mode-hint">Drag the sponge over Buddy until the bar is full.</p>
        ) : null}
        {interactionMode === 'feed' ? (
          <p className="kid-mode-hint">Drag the apple onto Buddy's mouth 3 times.</p>
        ) : null}
        {interactionMode === 'play' ? (
          <p className="kid-mode-hint">Drag the tickle tool over Buddy until the bar is full.</p>
        ) : null}
        {interactionMode === 'sleep' ? (
          <p className="kid-mode-hint">Pull the moon down to close night mode.</p>
        ) : null}
        <div className="kid-actions-grid">
          <ActionButton
            icon="F"
            label={isMode('feed') ? 'Drop food!' : 'Feed'}
            disabled={saving || !canEdit || (modeActive && !isMode('feed'))}
            onClick={() => {
              if (isMode('feed')) {
                setInteractionMode('');
                setInteractionProgress(0);
                return;
              }
              setInteractionMode('feed');
              setInteractionProgress(0);
            }}
          />
          <ActionButton
            icon="P"
            label={isMode('play') ? 'Tickle!' : 'Play'}
            disabled={saving || !canEdit || (modeActive && !isMode('play'))}
            onClick={() => {
              if (isMode('play')) {
                setInteractionMode('');
                setInteractionProgress(0);
                return;
              }
              setInteractionMode('play');
              setInteractionProgress(0);
            }}
          />
          <ActionButton
            icon="C"
            label={isMode('clean') ? 'Scrub!' : 'Clean'}
            disabled={saving || !canEdit || (modeActive && !isMode('clean'))}
            onClick={() => {
              if (isMode('clean')) {
                setInteractionMode('');
                setInteractionProgress(0);
                return;
              }
              setInteractionMode('clean');
              setInteractionProgress(0);
            }}
          />
          <ActionButton
            icon="Z"
            label={isMode('sleep') ? 'Night!' : 'Sleep'}
            disabled={saving || !canEdit || (modeActive && !isMode('sleep'))}
            onClick={() => {
              if (isMode('sleep')) {
                setInteractionMode('');
                setInteractionProgress(0);
                return;
              }
              setInteractionMode('sleep');
              setInteractionProgress(0);
            }}
          />
          {showMedicine ? (
            <ActionButton
              icon="M"
              label="Medicine"
              disabled={saving || !canEdit || modeActive}
              onClick={() => onKidAction('medicine')}
            />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
