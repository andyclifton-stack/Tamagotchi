import { useEffect, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';

function toDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

export default function ParentGateModal({
  open,
  hasParentPin,
  onClose,
  onSetup,
  onUnlock
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPin('');
      setConfirmPin('');
      setError('');
      setSaving(false);
    }
  }, [open, hasParentPin]);

  if (!open) return null;

  const handleSetup = async () => {
    setSaving(true);
    const result = await onSetup(pin, confirmPin);
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    if (result.reason === 'pin-format') {
      setError('Use exactly 4 numbers.');
      return;
    }
    if (result.reason === 'pin-mismatch') {
      setError('Those PINs do not match.');
      return;
    }
    setError('Could not save parent PIN.');
  };

  const handleUnlock = async () => {
    setSaving(true);
    const result = await onUnlock(pin);
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    setError('PIN did not match.');
  };

  return (
    <div className="modal-shell" role="dialog" aria-modal="true">
      <Card className="modal-card parent-gate-card">
        <div className="modal-card__head">
          <h3>Parent Space</h3>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close parent gate"
          >
            x
          </button>
        </div>

        {hasParentPin ? (
          <p className="muted-text">Enter your 4-digit parent PIN.</p>
        ) : (
          <p className="muted-text">
            Create a 4-digit parent PIN for hidden controls.
          </p>
        )}

        <label className="field">
          <span className="field-label">PIN</span>
          <input
            className="field-input field-input--center"
            value={pin}
            onChange={(event) => setPin(toDigits(event.target.value))}
            inputMode="numeric"
            maxLength={4}
            autoFocus
          />
        </label>

        {!hasParentPin ? (
          <label className="field">
            <span className="field-label">Confirm PIN</span>
            <input
              className="field-input field-input--center"
              value={confirmPin}
              onChange={(event) => setConfirmPin(toDigits(event.target.value))}
              inputMode="numeric"
              maxLength={4}
            />
          </label>
        ) : null}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          {hasParentPin ? (
            <Button
              type="button"
              disabled={saving || pin.length !== 4}
              onClick={handleUnlock}
            >
              {saving ? 'Checking...' : 'Unlock'}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={saving || pin.length !== 4 || confirmPin.length !== 4}
              onClick={handleSetup}
            >
              {saving ? 'Saving...' : 'Create PIN'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
