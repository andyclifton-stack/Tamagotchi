import { useEffect, useState } from 'react';
import Card from './ui/Card';
import PetScene from './PetScene';
import { formatStage } from '../lib/format';
import { HATCH_MS } from '../data/evolutionRules';

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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => window.clearInterval(timerId);
  }, []);

  if (!pet) {
    return (
      <Card className="empty-card">
        <h2>Getting your buddy ready...</h2>
      </Card>
    );
  }

  const timeLabel = pet.status?.isSleeping || pet.status?.lightsOff
    ? 'Night'
    : getCurrentTimePeriod(now);
  const clockLabel = formatClock(now);
  const eggCountdown = pet.currentStage === 'egg' ? getEggCountdown(pet, now) : '';

  return (
    <div className="kid-layout">
      <Card className="kid-pet-card">
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
          reaction={lastReaction}
          compact={false}
          interactive={canEdit && !saving}
          showMedicineTool={showMedicine}
          clockNow={now}
          onInteractionComplete={async (mode) => {
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
        <p className="kid-mode-hint">
          Drag tools from the pet window: apple to feed, feather to play, sponge to clean, moon to sleep.
        </p>
      </Card>
    </div>
  );
}
