let audioContext = null;
let audioUnlocked = false;

function getAudioContext() {
  if (!audioContext) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    audioContext = new AudioCtor();
  }
  return audioContext;
}

export async function unlockAudio() {
  const context = getAudioContext();
  if (!context) return false;
  if (context.state === 'suspended') {
    await context.resume();
  }
  audioUnlocked = context.state === 'running';
  return audioUnlocked;
}

function pulse({ frequencies, duration = 0.18, type = 'sine', volume = 0.05 }) {
  const context = getAudioContext();
  if (!context || !audioUnlocked) return;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

  frequencies.forEach((frequency, index) => {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, context.currentTime + index * 0.04);
    osc.connect(gain);
    osc.start(context.currentTime + index * 0.04);
    osc.stop(context.currentTime + duration + index * 0.04);
  });
}

const SOUND_MAP = {
  tap: () => pulse({ frequencies: [440], duration: 0.08, volume: 0.03 }),
  feed: () => pulse({ frequencies: [380, 520], duration: 0.12, type: 'triangle', volume: 0.05 }),
  clean: () => pulse({ frequencies: [520, 760, 980], duration: 0.2, type: 'sine', volume: 0.04 }),
  medicine: () => pulse({ frequencies: [330, 280, 520], duration: 0.22, type: 'square', volume: 0.035 }),
  happy: () => pulse({ frequencies: [520, 660, 880], duration: 0.25, type: 'triangle', volume: 0.05 }),
  sad: () => pulse({ frequencies: [320, 240], duration: 0.25, type: 'sine', volume: 0.045 }),
  sleep: () => pulse({ frequencies: [280, 420], duration: 0.28, type: 'sine', volume: 0.03 }),
  hatch: () => pulse({ frequencies: [660, 880, 990, 1320], duration: 0.35, type: 'triangle', volume: 0.05 }),
  evolve: () => pulse({ frequencies: [400, 580, 760, 1040, 1320], duration: 0.5, type: 'triangle', volume: 0.055 })
};

export function playSound(name, enabled = true) {
  if (!enabled) return;
  const sound = SOUND_MAP[name];
  if (sound) {
    sound();
  }
}
