export type UiSound = "tap" | "place" | "promote";

/** Sound design + how to add cues: see public/sounds/README.md */

const SOUND_ENABLED_KEY = "ourspaces:sound-enabled";

const SOUND_FILES: Record<UiSound, string> = {
  tap: "/sounds/tap.mp3",
  place: "/sounds/place.mp3",
  promote: "/sounds/promote.mp3",
};

const SOUND_VOLUMES: Record<UiSound, number> = {
  tap: 0.34,
  place: 0.42,
  promote: 0.52,
};

const audioCache = new Map<UiSound, HTMLAudioElement>();
let soundEnabled: boolean | null = null;

export function getSoundEnabled() {
  if (soundEnabled !== null) return soundEnabled;
  if (typeof window === "undefined") return true;

  soundEnabled = window.localStorage.getItem(SOUND_ENABLED_KEY) !== "false";
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }
}

function getAudio(sound: UiSound) {
  const cached = audioCache.get(sound);
  if (cached) return cached;

  const audio = new Audio(SOUND_FILES[sound]);
  audio.preload = "auto";
  audioCache.set(sound, audio);
  return audio;
}

export function preloadSounds() {
  if (typeof Audio === "undefined") return;
  (Object.keys(SOUND_FILES) as UiSound[]).forEach((sound) => {
    getAudio(sound).load();
  });
}

export function playSound(sound: UiSound) {
  if (!getSoundEnabled() || typeof Audio === "undefined") return;

  const audio = getAudio(sound).cloneNode(true) as HTMLAudioElement;
  audio.volume = SOUND_VOLUMES[sound];
  void audio.play().catch(() => {
    // Browsers can reject playback before the first user gesture.
  });
}

/* ---------------------------------------------------------------------------
 * Door sounds (F1 buddy list): someone joins -> creak, someone leaves -> close.
 * Synthesized with the Web Audio API, so there is no file to license. Off until
 * the person turns them on once; the choice is kept in localStorage.
 * ------------------------------------------------------------------------- */

export type DoorSound = "creak" | "close";

const DOOR_SOUND_KEY = "afterspace:door-sound";
let doorEnabled: boolean | null = null;
let audioContext: AudioContext | null = null;
const doorListeners = new Set<() => void>();

export function getDoorSoundEnabled() {
  if (doorEnabled !== null) return doorEnabled;
  if (typeof window === "undefined") return false;
  try {
    doorEnabled = window.localStorage.getItem(DOOR_SOUND_KEY) === "on";
  } catch {
    doorEnabled = false;
  }
  return doorEnabled;
}

export function setDoorSoundEnabled(enabled: boolean) {
  doorEnabled = enabled;
  try {
    window.localStorage.setItem(DOOR_SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // private mode: the choice just lasts for this visit
  }
  doorListeners.forEach((listener) => listener());
}

export function subscribeDoorSound(listener: () => void) {
  doorListeners.add(listener);
  return () => {
    doorListeners.delete(listener);
  };
}

function context() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  if (audioContext.state === "suspended") void audioContext.resume().catch(() => {});
  return audioContext;
}

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A low sweeping saw through a band filter: a hinge. */
function creak(ctx: AudioContext, at: number) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(70, at);
  osc.frequency.exponentialRampToValueAtTime(190, at + 0.32);
  osc.frequency.exponentialRampToValueAtTime(95, at + 0.7);
  filter.type = "bandpass";
  filter.Q.value = 6;
  filter.frequency.setValueAtTime(500, at);
  filter.frequency.linearRampToValueAtTime(1100, at + 0.4);
  filter.frequency.linearRampToValueAtTime(600, at + 0.7);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.16, at + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.75);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.8);
}

/** A soft wooden thud plus a latch click. */
function close(ctx: AudioContext, at: number) {
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(130, at);
  thud.frequency.exponentialRampToValueAtTime(45, at + 0.18);
  thudGain.gain.setValueAtTime(0.38, at);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  thud.connect(thudGain).connect(ctx.destination);
  thud.start(at);
  thud.stop(at + 0.25);

  const click = ctx.createBufferSource();
  const clickFilter = ctx.createBiquadFilter();
  const clickGain = ctx.createGain();
  click.buffer = noiseBuffer(ctx, 0.05);
  clickFilter.type = "bandpass";
  clickFilter.frequency.value = 1800;
  clickGain.gain.setValueAtTime(0.12, at + 0.12);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.17);
  click.connect(clickFilter).connect(clickGain).connect(ctx.destination);
  click.start(at + 0.12);
}

export function playDoor(sound: DoorSound) {
  if (!getDoorSoundEnabled()) return;
  const ctx = context();
  if (!ctx) return;
  const at = ctx.currentTime + 0.01;
  if (sound === "creak") creak(ctx, at);
  else close(ctx, at);
}
