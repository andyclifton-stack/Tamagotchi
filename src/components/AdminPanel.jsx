import { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

const MANUAL_KEYS = ['hunger', 'happiness', 'energy', 'hygiene', 'health', 'toilet', 'affection', 'discipline', 'messCount'];

export default function AdminPanel({ open, pet, onClose, onAction, onDelete }) {
  const [renameValue, setRenameValue] = useState('');
  const [manualStats, setManualStats] = useState({});
  const [forceStage, setForceStage] = useState('adult');
  const [forceBranch, setForceBranch] = useState('bright');

  useEffect(() => {
    if (pet) {
      setRenameValue(pet.name);
      setManualStats({
        hunger: pet.stats.hunger,
        happiness: pet.stats.happiness,
        energy: pet.stats.energy,
        hygiene: pet.stats.hygiene,
        health: pet.stats.health,
        toilet: pet.stats.toilet,
        affection: pet.stats.affection,
        discipline: pet.stats.discipline,
        messCount: pet.stats.messCount
      });
    }
  }, [pet]);

  if (!open || !pet) return null;

  const updateStat = (key, value) => {
    setManualStats((current) => ({ ...current, [key]: Number(value) }));
  };

  return (
    <div className="sheet-shell" role="dialog" aria-modal="true">
      <Card className="sheet-card">
        <div className="sheet-card__head">
          <div>
            <p className="eyebrow">Parent Tools</p>
            <h3>{pet.name}</h3>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close parent tools">
            x
          </button>
        </div>

        <div className="admin-grid">
          <Card className="admin-card">
            <h4>Quick rescue</h4>
            <div className="admin-actions-grid">
              <Button type="button" onClick={() => onAction('heal')}>Heal</Button>
              <Button type="button" onClick={() => onAction('clean')}>Clean</Button>
              <Button type="button" onClick={() => onAction('joy')}>Joy</Button>
              <Button type="button" onClick={() => onAction('energy')}>Energy</Button>
              <Button type="button" onClick={() => onAction('restore')}>Restore All</Button>
              <Button type="button" variant="secondary" onClick={() => onAction('toggle-live-forever')}>
                Toggle Live Forever
              </Button>
            </div>
          </Card>

          <Card className="admin-card">
            <h4>Rename pet</h4>
            <div className="field-row">
              <input
                className="field-input"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={24}
              />
              <Button
                type="button"
                onClick={() => onAction('rename', { name: renameValue })}
                disabled={!renameValue.trim()}
              >
                Rename
              </Button>
            </div>
          </Card>

          <Card className="admin-card">
            <h4>Manual stats</h4>
            <div className="slider-list">
              {MANUAL_KEYS.map((key) => (
                <label key={key} className="slider-row">
                  <span>{key}</span>
                  <input
                    type="range"
                    min="0"
                    max={key === 'messCount' ? '3' : '100'}
                    step="1"
                    value={manualStats[key] ?? 0}
                    onChange={(event) => updateStat(key, event.target.value)}
                  />
                  <strong>{Math.round(manualStats[key] ?? 0)}</strong>
                </label>
              ))}
            </div>
            <Button type="button" onClick={() => onAction('manual-stats', { stats: manualStats })} block>
              Apply Stat Changes
            </Button>
          </Card>

          <Card className="admin-card">
            <h4>Force evolution stage</h4>
            <div className="field-grid field-grid--two">
              <select
                className="field-select"
                value={forceStage}
                onChange={(event) => setForceStage(event.target.value)}
              >
                <option value="baby">Baby</option>
                <option value="child">Child</option>
                <option value="teen">Teen</option>
                <option value="adult">Adult</option>
              </select>
              <select
                className="field-select"
                value={forceBranch}
                onChange={(event) => setForceBranch(event.target.value)}
                disabled={forceStage !== 'adult'}
              >
                <option value="bright">Bright</option>
                <option value="scruffy">Scruffy</option>
              </select>
            </div>
            <Button
              type="button"
              onClick={() =>
                onAction('force-stage', {
                  stage: forceStage,
                  branch: forceStage === 'adult' ? forceBranch : undefined
                })
              }
              block
            >
              Force Stage
            </Button>
          </Card>

          <Card className="admin-card admin-card--danger">
            <h4>Danger zone</h4>
            <p className="muted-text">Delete removes the pet, events, and public share mirror.</p>
            <Button type="button" variant="danger" onClick={onDelete} block>
              Delete Pet
            </Button>
          </Card>
        </div>
      </Card>
    </div>
  );
}
