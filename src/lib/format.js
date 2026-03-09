import { STAGE_LABELS } from '../config/appConfig';

export function formatRelativeTime(timestamp, now = Date.now()) {
  if (!timestamp) return 'Never';
  const delta = Math.max(0, now - timestamp);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function formatAge(createdAt, now = Date.now()) {
  if (!createdAt) return '0m';
  const delta = Math.max(0, now - createdAt);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function formatStage(stage) {
  return STAGE_LABELS[stage] || 'Pet';
}

export function formatMoodLabel(mood) {
  if (!mood) return 'Settled';
  return mood
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatClock(timestamp) {
  if (!timestamp) return '--:--';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatPinStatus(pinEnabled) {
  return pinEnabled ? 'PIN Protected' : 'Open Care';
}
