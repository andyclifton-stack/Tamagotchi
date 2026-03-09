import { useEffect, useState } from 'react';
import { loadPublicPet } from '../services/petRepository';
import Card from './ui/Card';
import Button from './ui/Button';
import PetScene from './PetScene';
import Meter from './ui/Meter';
import { buildAppShareUrl, openWhatsAppShare } from '../lib/share';
import { formatMoodLabel, formatRelativeTime, formatStage } from '../lib/format';
import { PET_TYPE_MAP } from '../data/petTypes';

export default function PublicPetView({ shareToken }) {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPublicPet(shareToken)
      .then((snapshot) => {
        if (cancelled) return;
        if (!snapshot) {
          setError('That shared pet view could not be found.');
          setLoading(false);
          return;
        }
        setPet(snapshot);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message || 'Could not load the public pet view.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <div className="public-shell">
        <Card className="public-card"><p>Loading shared pet...</p></Card>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="public-shell">
        <Card className="public-card">
          <h2>Shared pet unavailable</h2>
          <p className="error-text">{error || 'This share link is not active.'}</p>
          <Button type="button" onClick={() => (window.location.href = buildAppShareUrl())}>
            Open App
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <Card className="public-card">
        <p className="eyebrow">Live share</p>
        <h1>{pet.name}</h1>
        <p className="muted-text">
          {PET_TYPE_MAP[pet.speciesId]?.name} · {formatStage(pet.currentStage)} · {formatMoodLabel(pet.currentMood)}
        </p>
        <p className="muted-text">Updated {formatRelativeTime(pet.updatedAt)}</p>

        <PetScene pet={pet} themeId={pet.theme} compact />

        <div className="public-meters">
          <Meter label="Hunger" value={pet.statsPreview.hunger} tone="warm" />
          <Meter label="Happiness" value={pet.statsPreview.happiness} tone="joy" />
          <Meter label="Energy" value={pet.statsPreview.energy} tone="cool" />
          <Meter label="Health" value={pet.statsPreview.health} tone="health" />
        </div>

        <div className="hero-actions">
          <Button type="button" onClick={() => (window.location.href = buildAppShareUrl())}>
            Open App
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => openWhatsAppShare(`Check in on ${pet.name} in Tamagotchi.`, window.location.href)}
          >
            Share on WhatsApp
          </Button>
        </div>
      </Card>
    </div>
  );
}
