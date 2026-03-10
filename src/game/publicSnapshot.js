export function toOwnerSummary(pet) {
  return {
    id: pet.id,
    name: pet.name,
    nameKey: pet.nameKey,
    speciesId: pet.speciesId,
    profileId: pet.profileId || '',
    profileName: pet.profileName || '',
    profileAvatarId: pet.profileAvatarId || '',
    currentStage: pet.currentStage,
    currentMood: pet.currentMood,
    theme: pet.theme,
    pinEnabled: pet.pinEnabled,
    liveForeverMode: pet.liveForeverMode,
    updatedAt: pet.updatedAt,
    lastPlayedAt: pet.lastPlayedAt,
    avatarSeed: pet.sceneSeed,
    statusPreview: {
      sleeping: Boolean(pet.status?.isSleeping),
      sick: Boolean(pet.status?.isSick),
      messCount: pet.stats.messCount,
      careCenterRest: Boolean(pet.status?.careCenterRest)
    }
  };
}

export function toPublicSnapshot(pet) {
  if (!pet.share?.shareToken) {
    return null;
  }

  return {
    shareToken: pet.share.shareToken,
    petId: pet.id,
    ownerUid: pet.ownerUid,
    name: pet.name,
    speciesId: pet.speciesId,
    currentStage: pet.currentStage,
    currentMood: pet.currentMood,
    theme: pet.theme,
    updatedAt: pet.updatedAt,
    lastPlayedAt: pet.lastPlayedAt,
    status: {
      isSleeping: Boolean(pet.status?.isSleeping),
      isSick: Boolean(pet.status?.isSick),
      lightsOff: Boolean(pet.status?.lightsOff),
      careCenterRest: Boolean(pet.status?.careCenterRest)
    },
    statsPreview: {
      hunger: pet.stats.hunger,
      happiness: pet.stats.happiness,
      energy: pet.stats.energy,
      hygiene: pet.stats.hygiene,
      health: pet.stats.health,
      affection: pet.stats.affection
    },
    evolutionBranch: pet.evolutionBranch,
    sceneSeed: pet.sceneSeed
  };
}
