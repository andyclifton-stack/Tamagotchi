import { useEffect, useMemo, useState } from 'react';
import { subscribeOwnerPets } from '../services/petRepository';

export function usePetList(ownerUid) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(Boolean(ownerUid));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ownerUid) {
      setPets([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = subscribeOwnerPets(
      ownerUid,
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
  }, [ownerUid]);

  return useMemo(
    () => ({
      pets,
      loading,
      error
    }),
    [pets, loading, error]
  );
}
