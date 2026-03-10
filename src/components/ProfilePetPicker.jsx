import { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { PET_TYPES } from '../data/petTypes';
import { getAvatarById, isSharedProfileId } from '../lib/profiles';

function SpeciesButton({ petType, active, onClick }) {
  return (
    <button
      type="button"
      className={`species-chip${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      <strong>{petType.name}</strong>
      <small>{petType.title}</small>
    </button>
  );
}

export default function ProfilePetPicker({
  profile,
  pets,
  onSelectPet,
  onCreatePet
}) {
  const avatar = getAvatarById(profile?.avatarId);
  const [createOpen, setCreateOpen] = useState(pets.length === 0);
  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState('mochi');
  const [pin, setPin] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!pets.length) {
      setCreateOpen(true);
    }
  }, [pets.length]);

  const handleCreate = async () => {
    if (!name.trim() || pin.length < 4) return;
    setWorking(true);
    try {
      await onCreatePet({
        name,
        speciesId,
        pin
      });
      setName('');
      setSpeciesId('mochi');
      setPin('');
      setCreateOpen(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="pet-picker-screen stack-lg">
      <Card className="picker-hero-card">
        <div className="picker-hero">
          <span className="picker-hero__avatar" aria-hidden="true">{avatar.emoji}</span>
          <div>
            <p className="eyebrow">{isSharedProfileId(profile?.id) ? 'Shared Pets' : 'Player'}</p>
            <h2 className="hero-title">{profile?.name || 'Choose a Pet'}</h2>
            <p className="hero-copy">Pick a pet or make a brand new buddy.</p>
          </div>
        </div>
      </Card>

      <div className="pet-picker-grid">
        {pets.map((pet) => (
          <button
            key={pet.id}
            type="button"
            className="pet-picker-card"
            onClick={() => onSelectPet(pet.id)}
          >
            <span className="pet-picker-card__avatar" aria-hidden="true">
              {PET_TYPES.find((petType) => petType.id === pet.speciesId)?.name?.charAt(0) || 'P'}
            </span>
            <strong>{pet.name}</strong>
            <span className="pet-picker-card__meta">{pet.currentStage}</span>
            {pet.pinEnabled ? <span className="pill-tag pill-tag--lock">Locked</span> : null}
          </button>
        ))}

        <button
          type="button"
          className="pet-picker-card pet-picker-card--new"
          onClick={() => setCreateOpen((current) => !current)}
        >
          <span className="pet-picker-card__avatar" aria-hidden="true">+</span>
          <strong>New Pet</strong>
          <span className="pet-picker-card__meta">Create one</span>
        </button>
      </div>

      {createOpen ? (
        <Card className="pet-create-card">
          <div className="section-head section-head--compact">
            <div>
              <span className="field-label">Make a Pet</span>
              <p className="muted-text">Pick a pet type and choose a name.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Hide
            </Button>
          </div>

          <label className="field">
            <span className="field-label">Pet Name</span>
            <input
              className="field-input"
              value={name}
              maxLength={18}
              placeholder="Type a pet name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Access PIN</span>
            <input
              className="field-input"
              value={pin}
              inputMode="numeric"
              maxLength={6}
              placeholder="4 to 6 digits"
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <small className="muted-text">
              Use this PIN on your phone, laptop, or tablet to open the same pet.
            </small>
          </label>

          <div className="species-chip-grid">
            {PET_TYPES.map((petType) => (
              <SpeciesButton
                key={petType.id}
                petType={petType}
                active={speciesId === petType.id}
                onClick={() => setSpeciesId(petType.id)}
              />
            ))}
          </div>

          <Button
            type="button"
            block
            disabled={working || !name.trim() || pin.length < 4}
            onClick={handleCreate}
          >
            {working ? 'Making pet...' : 'Create Pet'}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
