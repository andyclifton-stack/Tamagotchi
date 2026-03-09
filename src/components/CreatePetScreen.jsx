import { useMemo, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import ThemePicker from './ThemePicker';
import { PET_TYPES } from '../data/petTypes';

export default function CreatePetScreen({
  defaultTheme,
  existingPets,
  saving,
  onCancel,
  onCreate
}) {
  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState(PET_TYPES[0].id);
  const [theme, setTheme] = useState(defaultTheme);
  const [liveForeverMode, setLiveForeverMode] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const existingNameKeys = useMemo(
    () => new Set(existingPets.map((pet) => pet.nameKey)),
    [existingPets]
  );

  const randomizePetType = () => {
    const next = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
    setSpeciesId(next.id);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Give your pet a name first.');
      return;
    }
    const nameKey = trimmedName.toLowerCase().replace(/\s+/g, '-');
    if (existingNameKeys.has(nameKey)) {
      setError('You already have a pet with that name in this browser profile.');
      return;
    }
    if (pin.trim() && pin.trim().length < 3) {
      setError('Use at least 3 digits for a pet PIN.');
      return;
    }

    setError('');
    await onCreate({
      name: trimmedName,
      speciesId,
      theme,
      liveForeverMode,
      pin
    });
  };

  return (
    <form className="stack-lg" onSubmit={handleSubmit}>
      <Card className="form-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Create a pet</p>
            <h2>Choose a name, look, and care style</h2>
          </div>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <label className="field">
          <span className="field-label">Pet name</span>
          <input
            className="field-input"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 24))}
            placeholder="For example: Pudding"
            maxLength={24}
          />
        </label>

        <div className="section-head section-head--compact">
          <div>
            <span className="field-label">Pet type</span>
            <p className="muted-text">Pick manually or let the app surprise you.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={randomizePetType}>
            Random Type
          </Button>
        </div>

        <div className="species-grid">
          {PET_TYPES.map((petType) => (
            <button
              key={petType.id}
              type="button"
              className={`species-card${speciesId === petType.id ? ' is-active' : ''}`}
              onClick={() => setSpeciesId(petType.id)}
            >
              <strong>{petType.name}</strong>
              <span>{petType.title}</span>
              <p>{petType.description}</p>
              <small>{petType.personality}</small>
            </button>
          ))}
        </div>
      </Card>

      <Card className="form-card">
        <div className="section-head section-head--compact">
          <div>
            <span className="field-label">Visual theme</span>
            <p className="muted-text">The theme changes the presentation, not the mechanics.</p>
          </div>
        </div>
        <ThemePicker activeTheme={theme} onSelect={setTheme} />
      </Card>

      <Card className="form-card">
        <div className="field-grid">
          <label className="toggle-row">
            <div>
              <span className="field-label">Live Forever mode</span>
              <p className="muted-text">Recommended for a softer child-friendly experience.</p>
            </div>
            <input
              type="checkbox"
              checked={liveForeverMode}
              onChange={(event) => setLiveForeverMode(event.target.checked)}
            />
          </label>

          <label className="field">
            <span className="field-label">Optional pet PIN</span>
            <input
              className="field-input"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="Leave empty for no PIN"
              maxLength={6}
            />
            <small className="muted-text">Master parent PIN is always 999.</small>
          </label>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="form-actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Pet'}
          </Button>
        </div>
      </Card>
    </form>
  );
}
