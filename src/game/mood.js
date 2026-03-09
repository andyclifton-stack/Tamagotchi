function average(stats) {
  const values = [
    stats.hunger,
    stats.happiness,
    stats.energy,
    stats.hygiene,
    stats.health,
    stats.affection,
    stats.discipline
  ];
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function deriveMood(pet) {
  if (pet.status?.careCenterRest) {
    return {
      id: 'care-center',
      label: 'Resting at the Care Center',
      energy: 'low',
      advice: 'A parent can bring your pet back with the admin tools.'
    };
  }

  if (pet.status?.isSleeping) {
    return {
      id: 'sleeping',
      label: 'Sleeping',
      energy: 'calm',
      advice: 'Quiet time. Let your pet recover.'
    };
  }

  if (pet.status?.isSick) {
    return {
      id: 'sick',
      label: 'Under the Weather',
      energy: 'low',
      advice: 'Medicine and rest will help.'
    };
  }

  if (pet.stats.messCount > 0 || pet.stats.hygiene < 30) {
    return {
      id: 'messy',
      label: 'Needs Cleaning',
      energy: 'medium',
      advice: 'A wash or toilet break will help.'
    };
  }

  if (pet.stats.hunger < 26) {
    return {
      id: 'hungry',
      label: 'Hungry',
      energy: 'medium',
      advice: 'A proper meal will cheer your pet up.'
    };
  }

  if (pet.stats.affection < 28) {
    return {
      id: 'lonely',
      label: 'Lonely',
      energy: 'soft',
      advice: 'Spend some time comforting your pet.'
    };
  }

  if (pet.stats.energy < 24) {
    return {
      id: 'sleepy',
      label: 'Sleepy',
      energy: 'low',
      advice: 'A nap or bedtime routine would help.'
    };
  }

  const avg = average(pet.stats);
  if (avg >= 78 && pet.stats.messCount === 0) {
    return {
      id: 'sparkly',
      label: 'Sparkly Happy',
      energy: 'high',
      advice: 'Your care is shaping a bright evolution path.'
    };
  }

  if (avg < 45) {
    return {
      id: 'grumpy',
      label: 'Grumpy',
      energy: 'low',
      advice: 'Focus on the lowest two stats first.'
    };
  }

  return {
    id: 'content',
    label: 'Content',
    energy: 'balanced',
    advice: 'Everything looks steady right now.'
  };
}
