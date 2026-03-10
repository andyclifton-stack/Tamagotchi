import { useEffect, useMemo, useState } from 'react';
import { subscribeAccessPets } from '../services/petRepository';

export function useAccessPetList() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
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
  }, []);

  return useMemo(
    () => ({
      pets,
      loading,
      error
    }),
    [pets, loading, error]
  );
}
