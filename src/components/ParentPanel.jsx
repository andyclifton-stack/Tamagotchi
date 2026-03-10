import { useEffect, useMemo, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';
import { PET_TYPES } from '../data/petTypes';

export default function ParentPanel({
  open,
  pets,
  profiles,
  selectedPetId,
  settings,
  onClose,
  onLockGate,
  onSelectPet,
  onCreatePet,
  onRenamePet,
  onSetPetPin,
  onAssignProfile,
  onDeletePet,
  onDeleteOldPets,
  onShareApp,
  onSharePet,
  onSettingsChange,
  onAdminAction
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSpecies, setCreateSpecies] = useState('mochi');
  const [createProfileId, setCreateProfileId] = useState('');
  const [createPin, setCreatePin] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedPin, setSelectedPin] = useState('');
  const [working, setWorking] = useState(false);
  const activePet = useMemo(
    () => pets.find((pet) => pet.id === selectedPetId) || pets[0] || null,
    [pets, selectedPetId]
  );

  useEffect(() => {
    if (activePet) {
      setRenameValue(activePet.name);
      setSelectedProfileId(activePet.profileId || 'shared');
      setSelectedPin('');
    } else {
      setRenameValue('');
      setSelectedProfileId('shared');
      setSelectedPin('');
    }
  }, [activePet?.id]);

  if (!open) return null;

  const handleCreate = async () => {
    const nextName = createName.trim();
    if (!nextName) return;
    setWorking(true);
    try {
      await onCreatePet({
        name: nextName,
        speciesId: createSpecies,
        profileId: createProfileId || 'shared',
        theme: 'soft3d',
        liveForeverMode: true,
        pin: createPin
      });
      setCreateName('');
      setCreateSpecies('mochi');
      setCreatePin('');
      setShowCreate(false);
    } finally {
      setWorking(false);
    }
  };

  const handleRename = async () => {
    const nextName = renameValue.trim();
    if (!activePet || !nextName) return;
    setWorking(true);
    try {
      await onRenamePet(nextName);
    } finally {
      setWorking(false);
    }
  };

  const handleAssignProfile = async () => {
    if (!activePet) return;
    setWorking(true);
    try {
      await onAssignProfile(selectedProfileId || 'shared');
    } finally {
      setWorking(false);
    }
  };

  const handleSavePin = async () => {
    if (!activePet || selectedPin.length < 4) return;
    setWorking(true);
    try {
      await onSetPetPin(selectedPin);
      setSelectedPin('');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="modal-shell parent-panel-shell" role="dialog" aria-modal="true">
      <Card className="modal-card parent-panel">
        <div className="modal-card__head">
          <h3>Parent Space</h3>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close parent panel"
          >
            x
          </button>
        </div>

        <div className="parent-actions-top">
          <Button type="button" variant="secondary" size="sm" onClick={onShareApp}>
            Share App
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onLockGate}>
            Lock Parent Space
          </Button>
        </div>

        <Card className="parent-card">
          <div className="section-head section-head--compact">
            <div>
              <span className="field-label">Pets</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCreate((state) => !state)}
            >
              {showCreate ? 'Hide Create' : 'Create Pet'}
            </Button>
          </div>

          <div className="parent-pet-list">
            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                className={`parent-pet-row${activePet?.id === pet.id ? ' is-active' : ''}`}
                onClick={() => onSelectPet(pet.id)}
              >
                <strong>{pet.name}</strong>
                <span>{pet.currentStage}</span>
              </button>
            ))}
            {!pets.length ? <p className="muted-text">No pets yet.</p> : null}
          </div>

          {showCreate ? (
            <div className="parent-create-form">
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  className="field-input"
                  value={createName}
                  onChange={(event) =>
                    setCreateName(event.target.value.slice(0, 24))
                  }
                />
              </label>
              <label className="field">
                <span className="field-label">Type</span>
                <select
                  className="field-select"
                  value={createSpecies}
                  onChange={(event) => setCreateSpecies(event.target.value)}
                >
                  {PET_TYPES.map((petType) => (
                    <option key={petType.id} value={petType.id}>
                      {petType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Profile</span>
                <select
                  className="field-select"
                  value={createProfileId}
                  onChange={(event) => setCreateProfileId(event.target.value)}
                >
                  <option value="shared">Shared</option>
                  {profiles
                    .filter((profile) => !profile.system)
                    .map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Access PIN</span>
                <input
                  className="field-input"
                  value={createPin}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="4 to 6 digits"
                  onChange={(event) => setCreatePin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
              <Button
                type="button"
                disabled={working || !createName.trim() || createPin.length < 4}
                onClick={handleCreate}
              >
                {working ? 'Creating...' : 'Create'}
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="parent-card">
          <span className="field-label">Selected Pet</span>
          {activePet ? (
            <div className="parent-selected-actions">
              <label className="field">
                <span className="field-label">Rename</span>
                <input
                  className="field-input"
                  value={renameValue}
                  onChange={(event) =>
                    setRenameValue(event.target.value.slice(0, 24))
                  }
                />
              </label>
              <div className="hero-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={working || !renameValue.trim()}
                  onClick={handleRename}
                >
                  Rename
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={working || pets.length < 2}
                  onClick={onDeleteOldPets}
                >
                  Delete Old Pets
                </Button>
                <Button type="button" variant="secondary" onClick={() => onSharePet('native')}>
                  Share Pet
                </Button>
                <Button type="button" variant="secondary" onClick={() => onSharePet('whatsapp')}>
                  WhatsApp
                </Button>
                <Button type="button" variant="danger" onClick={onDeletePet}>
                  Delete Pet
                </Button>
              </div>
              <label className="field">
                <span className="field-label">Change Access PIN</span>
                <input
                  className="field-input"
                  value={selectedPin}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="4 to 6 digits"
                  onChange={(event) => setSelectedPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={working || selectedPin.length < 4}
                onClick={handleSavePin}
              >
                Save PIN
              </Button>
              <label className="field">
                <span className="field-label">Move To Profile</span>
                <select
                  className="field-select"
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                >
                  <option value="shared">Shared</option>
                  {profiles
                    .filter((profile) => !profile.system)
                    .map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                </select>
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={working}
                onClick={handleAssignProfile}
              >
                Move Pet
              </Button>
            </div>
          ) : (
            <p className="muted-text">Create a pet to begin.</p>
          )}
        </Card>

        <Card className="parent-card">
          <span className="field-label">Rescue Tools</span>
          <div className="admin-actions-grid">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAdminAction('heal')}
              disabled={!activePet}
            >
              Heal
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAdminAction('clean')}
              disabled={!activePet}
            >
              Clean
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAdminAction('joy')}
              disabled={!activePet}
            >
              Joy
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAdminAction('energy')}
              disabled={!activePet}
            >
              Energy
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAdminAction('restore')}
              disabled={!activePet}
            >
              Restore All
            </Button>
          </div>
        </Card>

        <Card className="parent-card">
          <span className="field-label">App Settings</span>
          <label className="toggle-row">
            <span>Sound</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  soundEnabled: event.target.checked
                })
              }
            />
          </label>
          <label className="toggle-row">
            <span>Reduced Motion</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  reducedMotion: event.target.checked
                })
              }
            />
          </label>
        </Card>
      </Card>
    </div>
  );
}
