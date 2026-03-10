import { useMemo, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { PET_TYPES } from '../data/petTypes';

function getSpeciesLabel(speciesId) {
  return PET_TYPES.find((petType) => petType.id === speciesId)?.name || 'Pet';
}

export default function PetAccessScreen({
  pets,
  loading,
  error,
  parentReady,
  onOpenPet
}) {
  const [query, setQuery] = useState('');

  const filteredPets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return pets;
    }

    return pets.filter((pet) => {
      const haystack = [
        pet.name,
        pet.profileName,
        pet.currentStage,
        getSpeciesLabel(pet.speciesId)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [pets, query]);

  return (
    <div className="access-screen stack-lg">
      <Card className="launcher-hero-card access-hero-card">
        <p className="eyebrow">Pets Screen</p>
        <h2 className="hero-title">Open your pet on any device.</h2>
        <p className="hero-copy">
          Tap your pet, then enter its access PIN to jump back in.
        </p>
        {parentReady ? (
          <p className="muted-text">
            Parent Space is unlocked, so pets with parent override can open here too.
          </p>
        ) : null}
      </Card>

      <Card className="access-search-card">
        <label className="field">
          <span className="field-label">Find a pet</span>
          <input
            className="field-input"
            value={query}
            maxLength={24}
            placeholder="Type a pet name"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </Card>

      {loading ? (
        <Card className="empty-card">
          <h2>Loading pets...</h2>
        </Card>
      ) : null}

      {error && !loading ? (
        <Card className="empty-card">
          <h2>Could not open pets</h2>
          <p className="error-text">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <div className="pet-picker-grid access-grid">
          {filteredPets.map((pet) => (
            <button
              key={pet.petId}
              type="button"
              className="pet-picker-card access-pet-card"
              onClick={() => onOpenPet(pet)}
            >
              <span className="pet-picker-card__avatar" aria-hidden="true">
                {getSpeciesLabel(pet.speciesId).charAt(0)}
              </span>
              <strong>{pet.name}</strong>
              <span className="pet-picker-card__meta">
                {pet.profileName ? `${pet.profileName} - ` : ''}
                {pet.currentStage}
              </span>
              <span className="pill-tag pill-tag--lock">PIN</span>
            </button>
          ))}
        </div>
      ) : null}

      {!loading && !error && !filteredPets.length ? (
        <Card className="empty-card">
          <h2>No pets yet</h2>
          <p className="muted-text">
            Create a pet and give it a PIN to make it available everywhere.
          </p>
          <Button type="button" variant="secondary" onClick={() => setQuery('')}>
            Clear Search
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
