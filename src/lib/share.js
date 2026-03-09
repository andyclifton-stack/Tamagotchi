import { APP_SHARE_URL } from '../config/appConfig';

export function buildAppShareUrl() {
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${origin}/`;
    }
  }
  return APP_SHARE_URL;
}

export function buildPublicShareUrl(token) {
  return `${buildAppShareUrl()}?view=public&share=${encodeURIComponent(token)}`;
}

export async function shareUrl({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { ok: true, method: 'native' };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { ok: false, method: 'cancelled' };
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return { ok: true, method: 'clipboard' };
  }

  window.prompt('Copy this link:', url);
  return { ok: true, method: 'prompt' };
}

export function buildWhatsAppUrl(message, url) {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`.trim())}`;
}

export function openWhatsAppShare(message, url) {
  window.open(buildWhatsAppUrl(message, url), '_blank', 'noopener,noreferrer');
}
