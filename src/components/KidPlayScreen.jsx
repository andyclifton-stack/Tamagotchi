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
  const [cleanMode, setCleanMode] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    setCleanMode(false);
    setCleanProgress(0);
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
          cleanMode={cleanMode}
          cleanProgress={cleanProgress}
          onCleanProgress={setCleanProgress}
          onCleanComplete={async () => {
            setCleanMode(false);
            setCleanProgress(0);
            await onKidAction('clean');
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
        {cleanMode ? (
          <p className="kid-mode-hint">Drag the sponge over Buddy until the bar is full.</p>
        ) : null}
        <div className="kid-actions-grid">
          <ActionButton
            icon="F"
            label="Feed"
            disabled={saving || !canEdit || cleanMode}
            onClick={() => onKidAction('feed')}
          />
          <ActionButton
            icon="P"
            label="Play"
            disabled={saving || !canEdit || cleanMode}
            onClick={() => onKidAction('play')}
          />
          <ActionButton
            icon="C"
            label={cleanMode ? 'Scrub!' : 'Clean'}
            disabled={saving || !canEdit}
            onClick={() => {
              if (cleanMode) {
                setCleanMode(false);
                setCleanProgress(0);
                return;
              }
              setCleanMode(true);
              setCleanProgress(0);
            }}
          />
          <ActionButton
            icon="Z"
            label="Sleep"
            disabled={saving || !canEdit || cleanMode}
            onClick={() => onKidAction('sleep')}
          />
          {showMedicine ? (
            <ActionButton
              icon="M"
              label="Medicine"
              disabled={saving || !canEdit || cleanMode}
              onClick={() => onKidAction('medicine')}
            />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
