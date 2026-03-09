import { useEffect, useMemo, useState } from 'react';
import { ensureAnonymousUser, subscribeToAuth } from '../services/auth';
import { clearLocalAppData, loadSettings, saveSettings } from '../lib/storage';

const BOOT_TIMEOUT_MS = 10000;

function getBootTimeoutMessage() {
  const host = window.location.hostname;
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    window.location.protocol === 'file:';

  if (isLocalHost) {
    return 'Firebase sign-in is blocked for this local address. This app is configured for the live site domain, so local testing needs localhost added to the Firebase API key referrers first.';
  }

  return 'Firebase is taking too long to respond. Please try again in a moment.';
}

export function useAppBoot(enabled = true) {
  const [settings, setSettingsState] = useState(loadSettings);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(enabled);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setBooting(false);
      return undefined;
    }

    let ignore = false;
    const timeoutId = window.setTimeout(() => {
      if (!ignore) {
        setError((current) => current || getBootTimeoutMessage());
        setBooting(false);
      }
    }, BOOT_TIMEOUT_MS);

    const unsubscribe = subscribeToAuth((nextUser) => {
      if (!ignore) {
        window.clearTimeout(timeoutId);
        setUser(nextUser);
        setBooting(false);
      }
    });

    ensureAnonymousUser().catch((bootError) => {
      if (!ignore) {
        window.clearTimeout(timeoutId);
        setError(bootError.message || 'Could not connect to Firebase.');
        setBooting(false);
      }
    });

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [enabled]);

  const setSettings = (nextSettings) => {
    setSettingsState((current) => {
      const resolved =
        typeof nextSettings === 'function' ? nextSettings(current) : nextSettings;
      saveSettings(resolved);
      return resolved;
    });
  };

  const resetLocalData = () => {
    clearLocalAppData();
    const defaults = loadSettings();
    setSettingsState(defaults);
    return defaults;
  };

  return useMemo(
    () => ({
      booting,
      error,
      user,
      settings,
      setSettings,
      resetLocalData
    }),
    [booting, error, user, settings]
  );
}

