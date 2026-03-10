import { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { KID_AVATARS, getAvatarById, isSharedProfileId } from '../lib/profiles';

export default function ProfileLauncher({
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState(KID_AVATARS[0].id);
  const [working, setWorking] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setWorking(true);
    try {
      await onCreateProfile({
        name,
        avatarId
      });
      setName('');
      setAvatarId(KID_AVATARS[0].id);
      setCreateOpen(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="launcher-screen stack-lg">
      <Card className="launcher-hero-card">
        <p className="eyebrow">Who&apos;s Playing?</p>
        <h2 className="hero-title">Pick your player and jump in.</h2>
        <p className="hero-copy">
          Everyone gets their own little pet world on this device.
        </p>
      </Card>

      <div className="launcher-grid">
        {profiles.map((profile) => {
          const avatar = getAvatarById(profile.avatarId);
          return (
            <button
              key={profile.id}
              type="button"
              className={`launcher-card${activeProfileId === profile.id ? ' is-active' : ''}`}
              onClick={() => onSelectProfile(profile.id)}
            >
              <span className="launcher-card__avatar" aria-hidden="true">
                {avatar.emoji}
              </span>
              <strong>{profile.name}</strong>
              <span className="launcher-card__hint">
                {isSharedProfileId(profile.id) ? 'Shared pets' : 'Tap to play'}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          className="launcher-card launcher-card--new"
          onClick={() => setCreateOpen((current) => !current)}
        >
          <span className="launcher-card__avatar" aria-hidden="true">+</span>
          <strong>New Player</strong>
          <span className="launcher-card__hint">Make your own spot</span>
        </button>
      </div>

      {createOpen ? (
        <Card className="launcher-create-card">
          <div className="section-head section-head--compact">
            <div>
              <span className="field-label">New Player</span>
              <p className="muted-text">Choose a picture and type a name.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
          </div>

          <label className="field">
            <span className="field-label">Name</span>
            <input
              className="field-input"
              value={name}
              maxLength={18}
              placeholder="Type a name"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="avatar-picker">
            {KID_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                className={`avatar-chip${avatarId === avatar.id ? ' is-active' : ''}`}
                onClick={() => setAvatarId(avatar.id)}
              >
                <span aria-hidden="true">{avatar.emoji}</span>
                <small>{avatar.label}</small>
              </button>
            ))}
          </div>

          <Button
            type="button"
            block
            disabled={working || !name.trim()}
            onClick={handleCreate}
          >
            {working ? 'Making player...' : 'Start Playing'}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
