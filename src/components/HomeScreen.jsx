import Card from './ui/Card';
import Button from './ui/Button';
import { PET_TYPE_MAP } from '../data/petTypes';
import { formatMoodLabel, formatRelativeTime, formatStage } from '../lib/format';

export default function HomeScreen({
  pets,
  featuredPet,
  onCreate,
  onLoad,
  onSettings,
  onHelp,
  onShareApp,
  onShareAppWhatsApp,
  onContinue
}) {
  return (
    <div className="stack-lg">
      <Card className="hero-card">
        <p className="eyebrow">Pocket Pet Club</p>
        <h2 className="hero-title">A modern Tamagotchi for quick check-ins, real-time growth, and child-friendly care.</h2>
        <p className="hero-copy">
          Create multiple pets, let time keep moving while the app is closed, and share a read-only live view with family.
        </p>
        <div className="hero-actions">
          <Button type="button" onClick={onCreate}>Create New Pet</Button>
          <Button type="button" variant="secondary" onClick={onLoad}>Load Pets</Button>
          <Button type="button" variant="ghost" onClick={onShareApp}>Share App</Button>
          <Button type="button" variant="ghost" onClick={onShareAppWhatsApp}>WhatsApp</Button>
        </div>
      </Card>

      {featuredPet ? (
        <Card className="continue-card">
          <div>
            <p className="eyebrow">Continue Caring</p>
            <h3>{featuredPet.name}</h3>
            <p className="muted-text">
              {PET_TYPE_MAP[featuredPet.speciesId]?.name} · {formatStage(featuredPet.currentStage)} · {formatMoodLabel(featuredPet.currentMood)}
            </p>
            <p className="muted-text">Last played {formatRelativeTime(featuredPet.lastPlayedAt || featuredPet.updatedAt)}</p>
          </div>
          <Button type="button" onClick={() => onContinue(featuredPet.id)}>
            Open Pet
          </Button>
        </Card>
      ) : null}

      <div className="dashboard-grid">
        <Card className="dashboard-card">
          <h3>Your care space</h3>
          <p className="muted-text">
            {pets.length
              ? `${pets.length} saved ${pets.length === 1 ? 'pet is' : 'pets are'} waiting for a check-in.`
              : 'No pets yet. Start with a fresh egg or create a favorite species.'}
          </p>
          <Button type="button" variant="secondary" block onClick={onLoad}>
            View Saved Pets
          </Button>
        </Card>

        <Card className="dashboard-card">
          <h3>Settings and themes</h3>
          <p className="muted-text">
            Swap between soft 3D, polished retro, and a playful family look without changing the gameplay.
          </p>
          <Button type="button" variant="secondary" block onClick={onSettings}>
            Open Settings
          </Button>
        </Card>

        <Card className="dashboard-card">
          <h3>Need a refresher?</h3>
          <p className="muted-text">
            Read how sleep, sickness, PINs, Live Forever mode, and public sharing behave.
          </p>
          <Button type="button" variant="secondary" block onClick={onHelp}>
            Help and About
          </Button>
        </Card>
      </div>
    </div>
  );
}
