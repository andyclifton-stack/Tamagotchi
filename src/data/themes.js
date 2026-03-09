export const THEMES = [
  {
    id: 'soft3d',
    name: 'Modern Soft 3D',
    family: 'modern',
    roomClass: 'theme-soft3d',
    tagline: 'Glossy gradients, cozy lighting, and soft depth.',
    accent: '#ff8a9f'
  },
  {
    id: 'retro',
    name: 'Retro Pixel-Art Polished',
    family: 'retro',
    roomClass: 'theme-retro',
    tagline: 'Crisp nostalgia inside a modern shell.',
    accent: '#ffd24d'
  },
  {
    id: 'cute',
    name: 'Cute Playful',
    family: 'cute',
    roomClass: 'theme-cute',
    tagline: 'Warm, charming, and expressive.',
    accent: '#6cd5a5'
  }
];

export const THEME_MAP = Object.fromEntries(THEMES.map((theme) => [theme.id, theme]));
