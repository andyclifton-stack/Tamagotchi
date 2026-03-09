import Card from './ui/Card';
import PetScene from './PetScene';
import { formatStage } from '../lib/format';

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

function ActionButton({ emoji, label, disabled, onClick }) {
  return (
    <button
      type="button"
      className="kid-action"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="kid-action__emoji" aria-hidden="true">
        {emoji}
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
        </div>
        <PetScene
          pet={pet}
          themeId="soft3d"
          reaction={lastReaction}
          compact={false}
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
        <div className="kid-actions-grid">
          <ActionButton
            emoji="🍽"
            label="Feed"
            disabled={saving || !canEdit}
            onClick={() => onKidAction('feed')}
          />
          <ActionButton
            emoji="🎈"
            label="Play"
            disabled={saving || !canEdit}
            onClick={() => onKidAction('play')}
          />
          <ActionButton
            emoji="🧼"
            label="Clean"
            disabled={saving || !canEdit}
            onClick={() => onKidAction('clean')}
          />
          <ActionButton
            emoji="🌙"
            label="Sleep"
            disabled={saving || !canEdit}
            onClick={() => onKidAction('sleep')}
          />
          {showMedicine ? (
            <ActionButton
              emoji="💊"
              label="Medicine"
              disabled={saving || !canEdit}
              onClick={() => onKidAction('medicine')}
            />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
