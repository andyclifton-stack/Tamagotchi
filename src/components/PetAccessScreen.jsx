import { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function PetAccessScreen({
  loading,
  error,
  parentReady,
  onOpenPet
}) {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [working, setWorking] = useState(false);

  const handleOpen = async () => {
    if (!code.trim()) return;
    setWorking(true);
    try {
      await onOpenPet({
        code,
        pin
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="access-screen stack-lg">
      <Card className="launcher-hero-card access-hero-card">
        <p className="eyebrow">Pets Screen</p>
        <h2 className="hero-title">Open your pet anywhere.</h2>
        <p className="hero-copy">
          Type your pet code and pet PIN to jump back into the same pet on another device.
        </p>
        {parentReady ? (
          <p className="muted-text">
            Parent Space is open, so parent override can open a pet code here too.
          </p>
        ) : null}
      </Card>

      <Card className="access-search-card">
        <label className="field">
          <span className="field-label">Pet Code</span>
          <input
            className="field-input field-input--center"
            value={code}
            maxLength={8}
            placeholder="AB12CD34"
            onChange={(event) => setCode(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))}
          />
        </label>

        <label className="field">
          <span className="field-label">Pet PIN</span>
          <input
            className="field-input field-input--center"
            value={pin}
            inputMode="numeric"
            maxLength={6}
            placeholder={parentReady ? 'PIN or parent override' : '4 to 6 digits'}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </label>

        <Button
          type="button"
          block
          disabled={working || !code.trim() || (!parentReady && pin.length < 4)}
          onClick={handleOpen}
        >
          {working ? 'Opening pet...' : 'Open Pet'}
        </Button>
      </Card>

      {loading ? (
        <Card className="empty-card">
          <h2>Checking pet access...</h2>
        </Card>
      ) : null}

      {error ? (
        <Card className="empty-card">
          <h2>Could not open pet</h2>
          <p className="error-text">{error}</p>
        </Card>
      ) : null}
    </div>
  );
}
