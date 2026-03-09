import { useEffect, useMemo, useState } from 'react';
import Card from './ui/Card';
import PetScene from './PetScene';
import { loadPublicPet } from '../services/petRepository';
import { buildAppShareUrl, openWhatsAppShare } from '../lib/share';
import { deriveKidNeeds } from '../lib/kidPlay';

function NeedMini({ label, value }) {
  return (
    <div className="public-need">
      <span>{label}</span>
      <strong>{Math.round(value)}%</strong>
    </div>
  );
}

export default function PublicPetView({ shareToken }) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const needs = useMemo(() => deriveKidNeeds(pet), [pet]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPublicPet(shareToken)
      .then((snapshot) => {
        if (cancelled) return;
        if (!snapshot) {
          setError('Pet link not found.');
          setLoading(false);
          return;
        }
        setPet(snapshot);
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError.message || 'Could not load pet.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <div className="public-shell">
        <Card className="public-card">
          <p>Loading pet...</p>
        </Card>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="public-shell">
        <Card className="public-card">
          <h2>Shared pet unavailable</h2>
          <p className="error-text">{error || 'This link is not active.'}</p>
          <button
            type="button"
            className="kid-mini-button"
            onClick={() => {
              window.location.href = buildAppShareUrl();
            }}
          >
            Open App
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <Card className="public-card">
        <p className="eyebrow">Read-only pet view</p>
        <h1>{pet.name}</h1>
        <PetScene pet={pet} themeId="soft3d" compact />

        <div className="public-needs-grid">
          <NeedMini label="Hunger" value={needs.hunger} />
          <NeedMini label="Happy" value={needs.happy} />
          <NeedMini label="Energy" value={needs.energy} />
          <NeedMini label="Clean" value={needs.clean} />
        </div>

        <div className="hero-actions">
          <button
            type="button"
            className="kid-mini-button"
            onClick={() => {
              window.location.href = buildAppShareUrl();
            }}
          >
            Open App
          </button>
          <button
            type="button"
            className="kid-mini-button kid-mini-button--ghost"
            onClick={() =>
              openWhatsAppShare(`Check in on ${pet.name}!`, window.location.href)
            }
          >
            Share
          </button>
        </div>
      </Card>
    </div>
  );
}
