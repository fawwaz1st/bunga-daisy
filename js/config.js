/**
 * Global Configuration for Daisy Interactive Experience
 * All constants, colors, timing, and physics parameters
 */

// ===== COLORS (Desaturated warm palette) =====
export const COLORS = {
    // Background
    skyTop: '#e8e4dc',
    skyMid: '#f5f0e6',
    skyBottom: '#d4cfb8',
    skyDusk: '#c9b8a8',
    skyNight: '#6b7b8a',
    
    // Flower
    petalBase: '#fffef8',
    petalShadow: '#f0ead8',
    petalHighlight: '#fffff8',
    centerOuter: '#e6c84a',
    centerInner: '#c9a832',
    centerDark: '#a08520',
    stemGreen: '#8ba878',
    stemDark: '#6b8858',
    leafGreen: '#9bb888',
    
    // Particles
    pollenGold: '#d4b84a',
    dustMote: '#c8c0a8',
    bokehWarm: '#e8d898',
    bokehCool: '#a8c8d8',
    fireflyGlow: '#ffe898',
    
    // Lighting
    volumetricLight: 'rgba(255, 252, 240, 0.15)',
    bloomGlow: 'rgba(255, 250, 220, 0.3)'
};

// ===== TIMING (milliseconds) =====
export const TIMING = {
    // Entrance animation stages
    stageA: { start: 0, end: 1500 },
    stageB: { start: 1500, end: 4000 },
    stageC: { start: 4000, end: 7000 },
    stageD: { start: 7000, end: 9000 },
    
    // Interactions
    petalHoverDuration: 200,
    petalClickDuration: 400,
    rippleDelay: 40,
    shimmerDuration: 300,
    
    // States
    idleTimeout: 10000,
    curiosityDuration: 5000,
    nightShiftThreshold: 90000,
    nightTransitionDuration: 60000,
    
    // Adaptive lighting
    dwellLightingMin: 60000,
    dwellLightingMax: 120000
};

// ===== PHYSICS =====
export const PHYSICS = {
    // Stem
    stemSwayAmount: 0.03,
    stemSwaySpeed: 0.5,
    stemStiffness: 0.15,
    stemDamping: 0.92,
    
    // Petals
    petalCount: 36,
    petalTiltMax: 4,  // degrees
    petalSpinAngle: 10, // degrees on click
    petalReboundDamping: 0.85,
    petalSpringStiffness: 0.12,
    
    // Center
    centerPulseSpeed: 0.8,
    centerPulseAmount: 0.02,
    centerBloomScale: 1.03,
    
    // Wind
    windBaseStrength: 0.3,
    windGustStrength: 0.8,
    windNoiseScale: 0.002,
    windNoiseSpeed: 0.0005,
    
    // Particles
    maxDustParticles: 50,
    maxPollenParticles: 30,
    maxBokehParticles: 15,
    maxFireflies: 8,
    pollenDissipateSpeed: 0.95,
    
    // Parallax
    parallaxLayers: [0.02, 0.05, 0.1, 0.2]
};

// ===== AUDIO =====
export const AUDIO = {
    masterVolume: 0.25,
    bpm: 78,
    
    // Pentatonic major scale frequencies (C major pentatonic)
    scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25],
    
    // Layer volumes
    padVolume: 0.15,
    bellVolume: 0.08,
    chordVolume: 0.12,
    subPadVolume: 0.1,
    
    // Effects
    reverbDecay: 2.5,
    reverbWet: 0.4,
    attackTime: 0.3,
    releaseTime: 1.5
};

// ===== EASING FUNCTIONS =====
export const Easing = {
    // Cubic ease in-out (for growth animations)
    cubicInOut: (t) => {
        return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    
    // Ease out cubic
    cubicOut: (t) => {
        return 1 - Math.pow(1 - t, 3);
    },
    
    // Ease in cubic
    cubicIn: (t) => {
        return t * t * t;
    },
    
    // Spring critically damped (for rebound)
    spring: (t, damping = 0.7) => {
        const omega = 10;
        return 1 - Math.exp(-omega * t) * (1 + omega * t * (1 - damping));
    },
    
    // Smooth step
    smoothStep: (t) => {
        return t * t * (3 - 2 * t);
    },
    
    // Elastic out (subtle)
    elasticOut: (t, amplitude = 0.3) => {
        if (t === 0 || t === 1) return t;
        const p = 0.4;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) * amplitude + 1;
    }
};

// ===== RESPONSIVE BREAKPOINTS =====
export const BREAKPOINTS = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1440
};

// ===== DEVICE CAPABILITY DETECTION =====
export const getDeviceCapabilities = () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = isMobile && window.devicePixelRatio < 2;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    return {
        isMobile,
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isLowEnd,
        prefersReducedMotion,
        maxParticles: isLowEnd ? 20 : (isMobile ? 35 : 50),
        targetFPS: isLowEnd ? 30 : 60,
        hasWebGL: !!gl,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
    };
};

// ===== UTILITY FUNCTIONS =====
export const Utils = {
    lerp: (a, b, t) => a + (b - a) * t,
    
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    
    mapRange: (value, inMin, inMax, outMin, outMax) => {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    },
    
    randomRange: (min, max) => Math.random() * (max - min) + min,
    
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    degToRad: (deg) => deg * (Math.PI / 180),
    
    radToDeg: (rad) => rad * (180 / Math.PI),
    
    distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    
    normalize: (x, y) => {
        const len = Math.hypot(x, y) || 1;
        return { x: x / len, y: y / len };
    }
};
