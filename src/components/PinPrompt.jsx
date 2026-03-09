import { useEffect, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';

export default function PinPrompt({
  open,
  title = 'Enter PIN',
  description = 'Enter the pet PIN or master PIN 999.',
  error = '',
  confirmLabel = 'Unlock',
  onClose,
  onConfirm
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-shell" role="dialog" aria-modal="true">
      <Card className="modal-card">
        <div className="modal-card__head">
          <h3>{title}</h3>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close PIN dialog">
            x
          </button>
        </div>
        <p className="muted-text">{description}</p>
        <input
          className="field-input field-input--center"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoFocus
          placeholder="PIN"
          maxLength={6}
        />
        {error ? <p className="error-text">{error}</p> : null}
        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
