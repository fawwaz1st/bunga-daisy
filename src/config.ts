/**
 * Global Configuration & Types for Daisy Interactive Experience
 */

// ===== INTERFACES =====
export interface Vec2 { x: number; y: number; }
export interface RGB { r: number; g: number; b: number; }
export interface DeviceCapabilities {
  isMobile: boolean;
  isTouch: boolean;
  isLowEnd: boolean;
  prefersReducedMotion: boolean;
  maxParticles: number;
  targetFPS: number;
  hasWebGL: boolean;
  pixelRatio: number;
}

export interface FlowerPosition {
  x: number;
  y: number;
  angle: number;
}

// ===== COLORS =====
export const COLORS = {
  skyTop: '#e8e4dc',
  skyMid: '#f5f0e6',
  skyBottom: '#d4cfb8',
  skyDusk: '#c9b8a8',
  skyNight: '#6b7b8a',

  petalBase: '#fffef8',
  petalShadow: '#f0ead8',
  petalHighlight: '#fffff8',
  centerOuter: '#e6c84a',
  centerInner: '#c9a832',
  centerDark: '#a08520',
  stemGreen: '#8ba878',
  stemDark: '#6b8858',
  leafGreen: '#9bb888',

  pollenGold: '#d4b84a',
  dustMote: '#c8c0a8',
  bokehWarm: '#e8d898',
  bokehCool: '#a8c8d8',
  fireflyGlow: '#ffe898',

  volumetricLight: 'rgba(255, 252, 240, 0.15)',
  bloomGlow: 'rgba(255, 250, 220, 0.3)'
} as const;

// ===== TIMING (ms) =====
export const TIMING = {
  stageA: { start: 0, end: 1500 },
  stageB: { start: 1500, end: 4000 },
  stageC: { start: 4000, end: 7000 },
  stageD: { start: 7000, end: 9000 },

  petalHoverDuration: 200,
  petalClickDuration: 400,
  rippleDelay: 40,
  shimmerDuration: 300,

  idleTimeout: 10000,
  curiosityDuration: 5000,
  nightShiftThreshold: 90000,
  nightTransitionDuration: 60000,

  dwellLightingMin: 60000,
  dwellLightingMax: 120000
} as const;

// ===== PHYSICS =====
export const PHYSICS = {
  stemSwayAmount: 0.03,
  stemSwaySpeed: 0.5,
  stemStiffness: 0.15,
  stemDamping: 0.92,

  petalCount: 36,
  petalTiltMax: 4,
  petalSpinAngle: 10,
  petalReboundDamping: 0.85,
  petalSpringStiffness: 0.12,
  petalBloomSpeed: 0.8,

  centerPulseSpeed: 0.8,
  centerPulseAmount: 0.02,
  centerBloomScale: 1.03,

  windBaseStrength: 0.3,
  windGustStrength: 0.8,
  windNoiseScale: 0.002,
  windNoiseSpeed: 0.0005,

  maxDustParticles: 50,
  maxPollenParticles: 30,
  maxBokehParticles: 15,
  maxFireflies: 8,
  pollenDissipateSpeed: 0.95,

  parallaxLayers: [0.02, 0.05, 0.1, 0.2] as const
} as const;

// ===== AUDIO =====
export const AUDIO = {
  masterVolume: 0.6,
  bpm: 78,

  scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25],

  padVolume: 0.2,
  bellVolume: 0.12,
  chordVolume: 0.18,
  subPadVolume: 0.15,

  reverbDecay: 2.5,
  reverbWet: 0.4,
  attackTime: 0.3,
  releaseTime: 1.5
} as const;

// ===== EASING =====
export const Easing = {
  cubicInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  cubicIn: (t: number) => t * t * t,
  spring: (t: number, damping = 0.7) => {
    const omega = 10;
    return 1 - Math.exp(-omega * t) * (1 + omega * t * (1 - damping));
  },
  smoothStep: (t: number) => t * t * (3 - 2 * t),
  elasticOut: (t: number, amplitude = 0.3) => {
    if (t === 0 || t === 1) return t;
    const p = 0.4;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) * amplitude + 1;
  }
} as const;

// ===== RESPONSIVE =====
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440
} as const;

// ===== DEVICE CAPABILITIES =====
export function getDeviceCapabilities(): DeviceCapabilities {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isLowEnd = isMobile && (window.devicePixelRatio < 2 || (navigator.hardwareConcurrency ?? 4) <= 4);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    isMobile,
    isTouch: isMobile,
    isLowEnd,
    prefersReducedMotion,
    maxParticles: isLowEnd ? 20 : (isMobile ? 35 : 50),
    targetFPS: isLowEnd ? 30 : 60,
    hasWebGL: !!gl,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
  };
}

// ===== TIME UTILS =====
export const Time = {
  toSeconds: (ms: number) => ms * 0.001,
  step: (dt: number) => Math.min(dt, 50),
  now: () => performance.now() * 0.001
};

// ===== MATH UTILS =====
export const Utils = {
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
  mapRange: (value: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
    outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin)),
  randomRange: (min: number, max: number) => Math.random() * (max - min) + min,
  randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  degToRad: (deg: number) => deg * (Math.PI / 180),
  radToDeg: (rad: number) => rad * (180 / Math.PI),
  distance: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
  normalize: (x: number, y: number) => {
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  }
};

// ===== CHORD PROGRESSIONS =====
export interface ChordDef {
  scale: 'lydian' | 'dorian' | 'mixolydian' | 'pentatonic';
  root: number;
  type: string;
  notes: number[];
}

export const SCALES: Record<string, number[]> = {
  lydian: [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25],
  dorian: [261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25],
  mixolydian: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25],
  pentatonic: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
};

export const PROGRESSIONS: ChordDef[] = [
  { scale: 'lydian', root: 0, type: 'maj7', notes: [0, 2, 4, 6] },
  { scale: 'lydian', root: 4, type: 'maj', notes: [4, 6, 1] },
  { scale: 'lydian', root: 2, type: 'min7', notes: [2, 4, 6, 1] },
  { scale: 'lydian', root: 5, type: 'sus4', notes: [5, 0, 1] },
  { scale: 'dorian', root: 0, type: 'min7', notes: [0, 2, 4, 6] },
  { scale: 'dorian', root: 3, type: 'maj', notes: [3, 5, 7] },
  { scale: 'mixolydian', root: 0, type: 'maj', notes: [0, 2, 4] },
  { scale: 'mixolydian', root: 6, type: 'maj', notes: [6, 1, 3] }
];

export const ARP_PATTERNS = [
  [0, 2, 4, 5, 4, 2],
  [0, 4, 2, 5, 4, 7, 5, 4],
  [7, 5, 4, 2, 0, 2, 4, 5]
];
