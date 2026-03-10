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

function trill({
  start = 440,
  end = 720,
  duration = 0.18,
  type = 'triangle',
  volume = 0.045
}) {
  const context = getAudioContext();
  if (!context || !audioUnlocked) return;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(start, context.currentTime);
  osc.frequency.exponentialRampToValueAtTime(end, context.currentTime + duration);
  osc.connect(gain);
  osc.start(context.currentTime);
  osc.stop(context.currentTime + duration);
}

const SOUND_MAP = {
  tap: () => pulse({ frequencies: [440], duration: 0.08, volume: 0.03 }),
  feed: () => pulse({ frequencies: [380, 520, 610], duration: 0.14, type: 'triangle', volume: 0.05 }),
  clean: () => pulse({ frequencies: [520, 760, 980], duration: 0.2, type: 'sine', volume: 0.04 }),
  medicine: () => pulse({ frequencies: [330, 280, 520], duration: 0.22, type: 'square', volume: 0.035 }),
  happy: () => pulse({ frequencies: [520, 660, 880], duration: 0.25, type: 'triangle', volume: 0.05 }),
  sad: () => pulse({ frequencies: [320, 240], duration: 0.25, type: 'sine', volume: 0.045 }),
  sleep: () => pulse({ frequencies: [260, 340, 420], duration: 0.28, type: 'sine', volume: 0.03 }),
  wake: () => trill({ start: 320, end: 660, duration: 0.18, type: 'triangle', volume: 0.04 }),
  hatch: () => pulse({ frequencies: [660, 880, 990, 1320], duration: 0.35, type: 'triangle', volume: 0.05 }),
  evolve: () => pulse({ frequencies: [400, 580, 760, 1040, 1320], duration: 0.5, type: 'triangle', volume: 0.055 }),
  laugh: () => pulse({ frequencies: [720, 900, 820], duration: 0.18, type: 'triangle', volume: 0.045 }),
  smile: () => trill({ start: 460, end: 720, duration: 0.14, type: 'triangle', volume: 0.04 }),
  blush: () => pulse({ frequencies: [560, 640], duration: 0.12, type: 'sine', volume: 0.034 }),
  shocked: () => pulse({ frequencies: [240, 420, 760], duration: 0.16, type: 'square', volume: 0.038 }),
  sleepy: () => pulse({ frequencies: [300, 260], duration: 0.16, type: 'sine', volume: 0.03 }),
  proud: () => pulse({ frequencies: [520, 660, 820], duration: 0.18, type: 'triangle', volume: 0.044 }),
  silly: () => trill({ start: 380, end: 540, duration: 0.16, type: 'square', volume: 0.035 }),
  sparkle: () => pulse({ frequencies: [620, 880, 1180], duration: 0.22, type: 'triangle', volume: 0.045 }),
  profileSelect: () => pulse({ frequencies: [540, 760], duration: 0.12, type: 'triangle', volume: 0.038 }),
  profileCreate: () => pulse({ frequencies: [420, 580, 820], duration: 0.2, type: 'triangle', volume: 0.044 }),
  petCreate: () => pulse({ frequencies: [360, 480, 620, 860], duration: 0.26, type: 'triangle', volume: 0.045 }),
  petName: () => trill({ start: 480, end: 820, duration: 0.16, type: 'triangle', volume: 0.04 })
};

export function hasSoundCue(name) {
  return Boolean(SOUND_MAP[name]);
}

export function playSound(name, enabled = true) {
  if (!enabled) return;
  const sound = SOUND_MAP[name];
  if (sound) {
    sound();
  }
}
