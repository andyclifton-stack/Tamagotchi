import { useEffect, useMemo, useState } from 'react';
import { ensureAnonymousUser, subscribeToAuth } from '../services/auth';
import { clearLocalAppData, loadSettings, saveSettings } from '../lib/storage';

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
    const unsubscribe = subscribeToAuth((nextUser) => {
      if (!ignore) {
        setUser(nextUser);
        setBooting(false);
      }
    });

    ensureAnonymousUser().catch((bootError) => {
      if (!ignore) {
        setError(bootError.message || 'Could not connect to Firebase.');
        setBooting(false);
      }
    });

    return () => {
      ignore = true;
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
