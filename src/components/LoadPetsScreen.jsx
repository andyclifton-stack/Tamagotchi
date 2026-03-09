import { useDeferredValue, useMemo, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { PET_TYPE_MAP } from '../data/petTypes';
import { formatMoodLabel, formatRelativeTime, formatStage } from '../lib/format';

export default function LoadPetsScreen({ pets, loading, error, onBack, onSelect }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const visiblePets = useMemo(() => {
    const key = deferredQuery.trim().toLowerCase();
    if (!key) return pets;
    return pets.filter((pet) => pet.name.toLowerCase().includes(key));
  }, [pets, deferredQuery]);

  return (
    <div className="stack-lg">
      <Card className="form-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Load pets</p>
            <h2>Search by name or browse your save list</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>

        <label className="field">
          <span className="field-label">Search by pet name</span>
          <input
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a pet name"
          />
        </label>
      </Card>

      {loading ? <Card className="empty-card"><p>Loading pets...</p></Card> : null}
      {error ? <Card className="empty-card"><p className="error-text">{error}</p></Card> : null}

      {!loading && !visiblePets.length ? (
        <Card className="empty-card">
          <h3>No pets match right now</h3>
          <p className="muted-text">Try a different search or create a new pet.</p>
        </Card>
      ) : null}

      <div className="pet-list">
        {visiblePets.map((pet) => (
          <button key={pet.id} type="button" className="pet-row" onClick={() => onSelect(pet.id)}>
            <div className={`pet-row__avatar ${pet.theme}`}>
              <span>{PET_TYPE_MAP[pet.speciesId]?.name?.slice(0, 2) || 'PT'}</span>
            </div>
            <div className="pet-row__main">
              <div className="pet-row__title">
                <strong>{pet.name}</strong>
                {pet.pinEnabled ? <span className="pill-tag pill-tag--lock">Locked</span> : null}
              </div>
              <p>{PET_TYPE_MAP[pet.speciesId]?.name} · {formatStage(pet.currentStage)} · {formatMoodLabel(pet.currentMood)}</p>
              <small>Last played {formatRelativeTime(pet.lastPlayedAt || pet.updatedAt)}</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
