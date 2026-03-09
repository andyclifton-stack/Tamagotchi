import { useMemo, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';
import PetScene from './PetScene';
import ActionDock from './ActionDock';
import StatusSheet from './StatusSheet';
import ThemePicker from './ThemePicker';
import AdminPanel from './AdminPanel';
import PinPrompt from './PinPrompt';
import { PET_TYPE_MAP } from '../data/petTypes';
import { formatAge, formatMoodLabel, formatStage } from '../lib/format';

export default function PetScreen({
  pet,
  saving,
  settings,
  lastReaction,
  events,
  canEdit,
  canAdmin,
  onBack,
  onHome,
  onAction,
  onThemeChange,
  onSharePet,
  onRequestUnlock,
  onRequestParentUnlock,
  onLock,
  onDeletePet
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [pinMode, setPinMode] = useState('');
  const [pinError, setPinError] = useState('');

  const species = useMemo(() => PET_TYPE_MAP[pet.speciesId], [pet.speciesId]);

  const handlePinSubmit = async (pin) => {
    if (pinMode === 'care') {
      const result = await onRequestUnlock(pin);
      if (result.ok) {
        setPinMode('');
        setPinError('');
      } else {
        setPinError('That PIN did not match this pet.');
      }
    }

    if (pinMode === 'admin') {
      const result = await onRequestParentUnlock(pin);
      if (result.ok) {
        setPinMode('');
        setPinError('');
        setAdminOpen(true);
      } else {
        setPinError('Parent tools need the master PIN 999.');
      }
    }
  };

  const handleAdminAction = async (kind, payload = {}) => {
    try {
      if (kind === 'rename') {
        await onAction({ type: 'admin', payload: { kind: 'rename', ...payload } });
        return;
      }
      await onAction({ type: 'admin', payload: { kind, ...payload } });
    } catch (error) {
      // The app notice banner is updated from hook error state.
    }
  };

  return (
    <div className="stack-lg">
      <Card className="pet-header-card">
        <div className="pet-header-bar">
          <div>
            <p className="eyebrow">{species?.name} · {formatStage(pet.currentStage)}</p>
            <h2>{pet.name}</h2>
            <p className="muted-text">{formatMoodLabel(pet.currentMood)} · Age {formatAge(pet.createdAt)}</p>
          </div>
          <div className="pet-header-actions">
            <Button type="button" variant="ghost" size="sm" onClick={() => setThemeOpen((open) => !open)}>
              Theme
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStatusOpen(true)}>
              Status
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onSharePet('native')}>
              Share
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onSharePet('whatsapp')}>
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (canAdmin) setAdminOpen(true);
                else {
                  setPinMode('admin');
                  setPinError('');
                }
              }}
            >
              Parent
            </Button>
            {canEdit ? (
              <Button type="button" variant="ghost" size="sm" onClick={onLock}>
                Lock
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {themeOpen ? (
        <Card className="form-card">
          <div className="section-head section-head--compact">
            <div>
              <span className="field-label">Switch theme</span>
              <p className="muted-text">Themes change the presentation only.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setThemeOpen(false)}>
              Hide
            </Button>
          </div>
          <ThemePicker activeTheme={pet.theme} onSelect={onThemeChange} />
        </Card>
      ) : null}

      <Card className="pet-main-card">
        <PetScene pet={pet} themeId={pet.theme} reaction={settings.soundEnabled ? lastReaction : 'tap'} />
        {!canEdit && pet.pinEnabled ? (
          <div className="pet-lock-banner">
            <strong>Preview mode</strong>
            <p>Enter the pet PIN to care for {pet.name}, or use master PIN 999 for parent access.</p>
            <Button
              type="button"
              onClick={() => {
                setPinMode('care');
                setPinError('');
              }}
            >
              Unlock Care
            </Button>
          </div>
        ) : null}

        <ActionDock
          pet={pet}
          canEdit={canEdit}
          saving={saving}
          onAction={onAction}
          onStatus={() => setStatusOpen(true)}
        />
      </Card>

      <div className="pet-footer-actions">
        <Button type="button" variant="secondary" onClick={onBack}>
          Back to Saves
        </Button>
        <Button type="button" variant="ghost" onClick={onHome}>
          Home
        </Button>
      </div>

      <StatusSheet open={statusOpen} pet={pet} onClose={() => setStatusOpen(false)} events={events} />
      <AdminPanel
        open={adminOpen}
        pet={pet}
        onClose={() => setAdminOpen(false)}
        onAction={handleAdminAction}
        onDelete={onDeletePet}
      />
      <PinPrompt
        open={Boolean(pinMode)}
        title={pinMode === 'admin' ? 'Parent PIN' : 'Pet PIN'}
        description={
          pinMode === 'admin'
            ? 'Enter master PIN 999 to unlock parent tools.'
            : 'Enter this pet PIN or the master PIN 999.'
        }
        error={pinError}
        confirmLabel={pinMode === 'admin' ? 'Unlock Parent Tools' : 'Unlock Care'}
        onClose={() => {
          setPinMode('');
          setPinError('');
        }}
        onConfirm={handlePinSubmit}
      />
    </div>
  );
}
