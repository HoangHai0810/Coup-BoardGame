let audioContext;
let enabled = localStorage.getItem('boardrealm-sound') !== 'off';
let musicTimer;
let musicKind;
let musicBar = 0;

const getContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
};

const tone = (ctx, frequency, start, duration, volume = 0.045, type = 'sine') => {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
};

const playMusicBar = () => {
  if (!enabled || !musicKind) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime + .03;
  const lobbyChords = [[196, 247, 294], [220, 277, 330], [174, 220, 262], [196, 247, 330]];
  const gameChords = [[147, 220, 294], [165, 247, 330], [131, 196, 262], [147, 220, 277]];
  const chords = musicKind === 'lobby' ? lobbyChords : gameChords;
  const chord = chords[musicBar % chords.length];
  chord.forEach((frequency, index) => tone(ctx, frequency, now + index * .035, 2.25, index === 0 ? .008 : .0055, 'sine'));
  const melody = musicKind === 'lobby' ? [392, 440, 494, 440] : [294, 330, 392, 330];
  tone(ctx, melody[musicBar % melody.length], now + .28, .42, .008, 'triangle');
  tone(ctx, melody[(musicBar + 1) % melody.length], now + 1.15, .5, .007, 'triangle');
  musicBar += 1;
};

export function startBackgroundMusic(kind) {
  if (!['lobby', 'game'].includes(kind)) return;
  if (musicKind === kind && musicTimer) return;
  if (musicTimer) window.clearInterval(musicTimer);
  musicKind = kind;
  musicBar = 0;
  playMusicBar();
  musicTimer = window.setInterval(playMusicBar, 2400);
}

export function pulseBackgroundMusic() { playMusicBar(); }

export function stopBackgroundMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = undefined;
  musicKind = undefined;
}

export function playGameSound(effect = 'action', force = false) {
  if (!enabled && !force) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.01;
  if (effect === 'turn') {
    tone(ctx, 523, now, .14); tone(ctx, 659, now + .11, .16); tone(ctx, 784, now + .22, .2);
  } else if (effect === 'dice') {
    [190, 240, 170, 280].forEach((frequency, index) => tone(ctx, frequency, now + index * .045, .08, .035, 'square'));
  } else if (effect === 'card') {
    tone(ctx, 360, now, .08, .03, 'triangle'); tone(ctx, 520, now + .055, .12, .035, 'triangle');
  } else if (effect === 'step') {
    tone(ctx, 150, now, .055, .018, 'triangle');
  } else if (effect === 'money') {
    tone(ctx, 660, now, .08, .03, 'sine'); tone(ctx, 880, now + .06, .14, .035, 'sine');
  } else if (effect === 'ui') {
    tone(ctx, 620, now, .055, .018, 'sine');
  } else if (effect === 'success') {
    tone(ctx, 523, now, .1, .025); tone(ctx, 659, now + .075, .12, .03); tone(ctx, 784, now + .15, .18, .035);
  } else if (effect === 'alert') {
    tone(ctx, 310, now, .13, .025, 'square'); tone(ctx, 260, now + .12, .17, .025, 'square');
  } else if (effect === 'ambient') {
    tone(ctx, 196, now, .8, .009, 'sine'); tone(ctx, 294, now + .18, .85, .007, 'sine'); tone(ctx, 392, now + .36, .7, .006, 'sine');
  } else {
    tone(ctx, 392, now, .08, .025, 'triangle'); tone(ctx, 523, now + .055, .12, .03, 'triangle');
  }
}

export function isSoundEnabled() { return enabled; }
export function setGameSoundEnabled(value) {
  enabled = value;
  localStorage.setItem('boardrealm-sound', value ? 'on' : 'off');
  if (value) {
    playGameSound('turn', true);
    playMusicBar();
  }
}
