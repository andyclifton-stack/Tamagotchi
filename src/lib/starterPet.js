export function buildStarterPetInput() {
  return {
    name: 'Buddy',
    speciesId: 'mochi',
    theme: 'soft3d',
    liveForeverMode: true,
    pin: ''
  };
}

export function shouldAutoCreateStarter({
  booting,
  ownerUid,
  petListLoading,
  petCount,
  starterCreated
}) {
  if (booting) return false;
  if (!ownerUid) return false;
  if (petListLoading) return false;
  if (petCount > 0) return false;
  if (starterCreated) return false;
  return true;
}
