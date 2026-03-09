export const PET_TYPES = [
  {
    id: 'mochi',
    name: 'Mochi',
    title: 'Cloud Hopper',
    description: 'A bouncy marshmallow pet that loves attention and calm evenings.',
    personality: 'Gentle, cuddly, and slightly clingy.',
    tendencies: {
      hungerRate: 0.92,
      affectionRate: 1.12,
      hygieneRate: 1,
      energyDrain: 0.95,
      energyRecovery: 1.05,
      disciplineRate: 1
    },
    colors: {
      primary: '#fff7f0',
      secondary: '#f5c2d8',
      accent: '#f28bab',
      outline: '#5f4469'
    },
    render: {
      body: 'round',
      ears: 'petal',
      cheeks: true
    },
    adultBranches: {
      bright: 'Mochi Bloom',
      scruffy: 'Mochi Drift'
    }
  },
  {
    id: 'sprig',
    name: 'Sprig',
    title: 'Garden Buddy',
    description: 'A leafy creature that stays tidy but can mope if ignored.',
    personality: 'Sunny, sensitive, and neat.',
    tendencies: {
      hungerRate: 0.96,
      affectionRate: 1.06,
      hygieneRate: 0.82,
      energyDrain: 0.9,
      energyRecovery: 1.08,
      disciplineRate: 1
    },
    colors: {
      primary: '#d6ffd7',
      secondary: '#74c17a',
      accent: '#4da66b',
      outline: '#355246'
    },
    render: {
      body: 'seed',
      ears: 'leaf',
      cheeks: false
    },
    adultBranches: {
      bright: 'Sprig Star',
      scruffy: 'Sprig Tangle'
    }
  },
  {
    id: 'volt',
    name: 'Volt',
    title: 'Spark Pal',
    description: 'A lively electric companion that gets silly when overtired.',
    personality: 'Energetic, playful, and restless.',
    tendencies: {
      hungerRate: 1.04,
      affectionRate: 0.98,
      hygieneRate: 1,
      energyDrain: 1.14,
      energyRecovery: 1,
      disciplineRate: 1.06
    },
    colors: {
      primary: '#fff8c4',
      secondary: '#ffd447',
      accent: '#ff9f1c',
      outline: '#534534'
    },
    render: {
      body: 'bolt',
      ears: 'spike',
      cheeks: false
    },
    adultBranches: {
      bright: 'Volt Glow',
      scruffy: 'Volt Frazzle'
    }
  },
  {
    id: 'pebble',
    name: 'Pebble',
    title: 'Pocket Guardian',
    description: 'A sturdy stone pet with quiet loyalty and steady moods.',
    personality: 'Brave, patient, and slightly stubborn.',
    tendencies: {
      hungerRate: 1.03,
      affectionRate: 0.9,
      hygieneRate: 0.94,
      energyDrain: 0.88,
      energyRecovery: 0.96,
      disciplineRate: 0.82
    },
    colors: {
      primary: '#e7eef3',
      secondary: '#9eb2c0',
      accent: '#6b92a8',
      outline: '#344657'
    },
    render: {
      body: 'oval',
      ears: 'stub',
      cheeks: false
    },
    adultBranches: {
      bright: 'Pebble Shine',
      scruffy: 'Pebble Moss'
    }
  }
];

export const PET_TYPE_MAP = Object.fromEntries(PET_TYPES.map((petType) => [petType.id, petType]));
