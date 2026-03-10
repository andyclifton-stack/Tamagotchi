import { useEffect, useMemo, useState } from 'react';
import { subscribeAccessPets } from '../services/petRepository';

export function useAccessPetList({ enabled = true, ownerUid = '' } = {}) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && ownerUid));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !ownerUid) {
      setPets([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    setLoading(true);
    setError('');
    const unsubscribe = subscribeAccessPets(
      (items) => {
        setPets(items);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message || 'Could not load pets.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [enabled, ownerUid]);

  return useMemo(
    () => ({
      pets,
      loading,
      error
    }),
    [pets, loading, error]
  );
}
