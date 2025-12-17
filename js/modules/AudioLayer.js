/**
 * AudioLayer Module - MOBILE OPTIMIZED VERSION
 * Generative music with mobile-friendly audio processing
 */

import { AUDIO, Utils, getDeviceCapabilities } from '../config.js';

export class AudioLayer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;
        this.reverbNode = null;
        this.isInitialized = false;
        this.isPlaying = false;

        // Get device capabilities
        this.capabilities = null;

        // Orchestral layers
        this.layers = {
            strings: null,
            pad: null,
            bass: null,
            nature: null,
            night: null
        };

        // Arpeggio system
        this.arpeggioInterval = null;
        this.arpeggioTimeout = null;
        this.currentArpPattern = 0;

        // Music state
        this.tempo = 68;
        this.currentChord = 0;
        this.intensity = 0;
        this.breathPhase = 0;

        // Scales
        this.scales = {
            lydian: [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25],
            dorian: [261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25],
            mixolydian: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25],
            pentatonic: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
        };
        this.currentScale = this.scales.lydian;

        // Chord progressions
        this.progressions = [
            { scale: 'lydian', root: 0, type: 'maj7', notes: [0, 2, 4, 6] },
            { scale: 'lydian', root: 4, type: 'maj', notes: [4, 6, 1] },
            { scale: 'lydian', root: 2, type: 'min7', notes: [2, 4, 6, 1] },
            { scale: 'lydian', root: 5, type: 'sus4', notes: [5, 0, 1] },
            { scale: 'dorian', root: 0, type: 'min7', notes: [0, 2, 4, 6] },
            { scale: 'dorian', root: 3, type: 'maj', notes: [3, 5, 7] },
            { scale: 'mixolydian', root: 0, type: 'maj', notes: [0, 2, 4] },
            { scale: 'mixolydian', root: 6, type: 'maj', notes: [6, 1, 3] }
        ];

        // Arpeggio patterns
        this.arpPatterns = [
            [0, 2, 4, 5, 4, 2],
            [0, 4, 2, 5, 4, 7, 5, 4],
            [7, 5, 4, 2, 0, 2, 4, 5]
        ];
    }

    async init() {
        if (this.isInitialized) return true;

        try {
            // Detect device capabilities
            this.capabilities = getDeviceCapabilities();

            // Create audio context
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();

            // iOS/Safari requires resume after user gesture
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            // Double-check resume worked (iOS sometimes needs multiple attempts)
            if (this.ctx.state !== 'running') {
                console.log('AudioContext not running, state:', this.ctx.state);
                // Try resume again
                await this.ctx.resume();
            }

            // Dynamics compressor
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -18;
            this.compressor.knee.value = 25;
            this.compressor.ratio.value = 6;
            this.compressor.attack.value = 0.01;
            this.compressor.release.value = 0.2;

            // Master gain - mobile gets 2x boost to compensate for lower browser output
            this.masterGain = this.ctx.createGain();
            const mobileBoost = this.capabilities.isMobile ? 2.0 : 1.0;
            this.masterGain.gain.value = AUDIO.masterVolume * mobileBoost;

            // Create reverb (shorter for mobile)
            this.reverbNode = await this.createReverb();

            // Connect chain
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);

            this.isInitialized = true;
            console.log('Audio initialized, state:', this.ctx.state);
            return true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
            return false;
        }
    }

    async createReverb() {
        const convolver = this.ctx.createConvolver();
        const sampleRate = this.ctx.sampleRate;

        // Mobile: shorter reverb (1.5s), Desktop: longer (3s)
        const reverbTime = this.capabilities.isMobile ? 1.5 : 3;
        const length = Math.floor(sampleRate * reverbTime);
        const impulse = this.ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const t = i / length;
                // Simpler decay for mobile
                const decay = Math.exp(-3 * t) * 0.5;
                const noise = (Math.random() * 2 - 1);
                data[i] = noise * decay * 0.3;
            }
        }

        convolver.buffer = impulse;

        // Lower wet mix for mobile
        const wetGain = this.ctx.createGain();
        wetGain.gain.value = this.capabilities.isMobile ? 0.2 : 0.35;

        convolver.connect(wetGain);
        wetGain.connect(this.compressor);

        return { convolver, wetGain };
    }

    // ═══════════════════════════════════════════════════════
    // ORCHESTRAL LAYERS (Optimized for mobile)
    // ═══════════════════════════════════════════════════════

    startAmbientPad() {
        if (!this.isInitialized) return;
        this.isPlaying = true;

        // Mobile: fewer layers
        if (this.capabilities.isMobile) {
            this.startSimplePad();
            this.startArpeggiator();
        } else {
            this.startStringsLayer();
            this.startPadLayer();
            this.startBassLayer();
            this.startArpeggiator();
            this.startNatureLayer();
        }

        this.startBreathing();
        this.startChordProgression();
    }

    // Simple pad for mobile (fewer oscillators)
    startSimplePad() {
        const chord = this.progressions[this.currentChord];
        this.currentScale = this.scales[chord.scale];

        const notes = [
            this.currentScale[0] / 2,
            this.currentScale[4] / 2
        ];

        this.layers.pad = notes.map((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 600;

            gain.gain.value = 0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverbNode.convolver);
            gain.connect(this.compressor);

            osc.start();

            gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 3);

            return { osc, gain, filter, baseFreq: freq };
        });
    }

    // Full strings layer for desktop
    startStringsLayer() {
        const chord = this.progressions[this.currentChord];
        this.currentScale = this.scales[chord.scale];

        const notes = [
            this.currentScale[0] / 2,
            this.currentScale[4] / 2,
            this.currentScale[0],
            this.currentScale[2]
        ];

        this.layers.strings = notes.map((freq, i) => {
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc1.frequency.value = freq;
            osc2.frequency.value = freq * 1.003;

            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            filter.Q.value = 0.8;

            gain.gain.value = 0;

            const mixer = this.ctx.createGain();
            mixer.gain.value = 0.4;

            osc1.connect(mixer);
            osc2.connect(mixer);
            mixer.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverbNode.convolver);
            gain.connect(this.compressor);

            osc1.start();
            osc2.start();

            const delay = i * 0.5;
            gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + delay + 4);

            return { osc1, osc2, gain, filter, baseFreq: freq };
        });
    }

    startPadLayer() {
        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];
        const chordNotes = chord.notes.slice(0, 3); // Limit to 3 notes

        this.layers.pad = chordNotes.map((noteIdx, i) => {
            const freq = scale[noteIdx % scale.length] / 2;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 500;

            gain.gain.value = 0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverbNode.convolver);

            osc.start();

            gain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 5);

            return { osc, gain, filter, baseFreq: freq };
        });
    }

    startBassLayer() {
        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];
        const bassFreq = scale[chord.root] / 4;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = bassFreq;

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.value = 0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        osc.start();

        gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 4);

        this.layers.bass = { osc, gain, filter, baseFreq: bassFreq };
    }

    startArpeggiator() {
        this.currentArpPattern = 0;
        let noteIndex = 0;

        const beatTime = 60 / this.tempo;
        // Mobile: slower arpeggios
        const noteInterval = this.capabilities.isMobile ? beatTime : beatTime / 2;

        const playNextNote = () => {
            if (!this.isPlaying) return;

            const chord = this.progressions[this.currentChord];
            const scale = this.scales[chord.scale];
            const pattern = this.arpPatterns[this.currentArpPattern];

            const patternNote = pattern[noteIndex % pattern.length];
            if (patternNote >= 0) {
                const scaleIdx = patternNote % scale.length;
                const octave = Math.floor(noteIndex / pattern.length) % 2 === 0 ? 1 : 2;
                const freq = scale[scaleIdx] * octave;

                // Mobile: quieter harp notes
                const vol = this.capabilities.isMobile ? 0.025 : 0.04;
                this.playHarpNote(freq, vol, 2);
            }

            noteIndex = (noteIndex + 1) % (pattern.length * 2);

            if (noteIndex === 0 && Math.random() > 0.6) {
                this.currentArpPattern = (this.currentArpPattern + 1) % this.arpPatterns.length;
            }
        };

        this.arpeggioTimeout = setTimeout(() => {
            if (this.isPlaying) {
                playNextNote();
                this.arpeggioInterval = setInterval(playNextNote, noteInterval * 1000);
            }
        }, 4000);
    }

    playHarpNote(freq, volume, duration) {
        if (!this.isInitialized) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.3);

        gain.gain.value = 0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverbNode.convolver);
        gain.connect(this.compressor);

        osc.start();

        const now = this.ctx.currentTime;
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.stop(now + duration + 0.1);
    }

    startNatureLayer() {
        if (this.capabilities.isMobile) return; // Skip on mobile

        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 350;
        filter.Q.value = 0.4;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        noise.start();

        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 6);

        this.layers.nature = { noise, filter, gain };
    }

    startChordProgression() {
        const changeChord = () => {
            if (!this.isPlaying) return;

            this.currentChord = (this.currentChord + 1) % this.progressions.length;
            this.updateLayersToChord();

            const nextChange = 12000 + Math.random() * 4000;
            setTimeout(changeChord, nextChange);
        };

        setTimeout(changeChord, 15000);
    }

    updateLayersToChord() {
        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];
        this.currentScale = scale;

        const transitionTime = 3;
        const now = this.ctx.currentTime;

        // Update strings (desktop only)
        if (this.layers.strings) {
            const stringNotes = [scale[0] / 2, scale[4] / 2, scale[0], scale[2]];
            this.layers.strings.forEach((s, i) => {
                const newFreq = stringNotes[i % stringNotes.length];
                s.osc1.frequency.linearRampToValueAtTime(newFreq, now + transitionTime);
                s.osc2.frequency.linearRampToValueAtTime(newFreq * 1.003, now + transitionTime);
            });
        }

        // Update bass (desktop only)
        if (this.layers.bass) {
            const bassFreq = scale[chord.root] / 4;
            this.layers.bass.osc.frequency.linearRampToValueAtTime(bassFreq, now + transitionTime);
        }

        // Update pad
        if (this.layers.pad) {
            const padNotes = this.capabilities.isMobile
                ? [scale[0] / 2, scale[4] / 2]
                : chord.notes.slice(0, 3).map(n => scale[n % scale.length] / 2);

            this.layers.pad.forEach((p, i) => {
                if (padNotes[i]) {
                    p.osc.frequency.linearRampToValueAtTime(padNotes[i], now + transitionTime);
                }
            });
        }
    }

    startBreathing() {
        const breathe = () => {
            if (!this.isPlaying) return;

            this.breathPhase += 0.015;
            const breath = (Math.sin(this.breathPhase) + 1) * 0.5;

            if (this.layers.strings) {
                this.layers.strings.forEach(s => {
                    const targetFreq = 600 + breath * 400;
                    s.filter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.15);
                });
            }

            if (this.layers.pad && this.capabilities.isMobile) {
                this.layers.pad.forEach(p => {
                    const targetFreq = 400 + breath * 200;
                    p.filter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.15);
                });
            }

            this.intensity = breath;

            requestAnimationFrame(breathe);
        };

        breathe();
    }

    // ═══════════════════════════════════════════════════════
    // INTERACTION SOUNDS
    // ═══════════════════════════════════════════════════════

    playHoverBell(pan = 0) {
        if (!this.isInitialized) return;

        const noteIdx = Utils.randomInt(4, 7);
        const freq = this.currentScale[noteIdx % this.currentScale.length] * 2;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.value = 0;

        osc.connect(gain);
        gain.connect(this.reverbNode.convolver);
        gain.connect(this.compressor);

        osc.start();

        const now = this.ctx.currentTime;
        const vol = this.capabilities.isMobile ? 0.03 : 0.05;
        gain.gain.linearRampToValueAtTime(vol, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.stop(now + 1.6);
    }

    playClickChord(pan = 0) {
        if (!this.isInitialized) return;

        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];

        // Mobile: fewer notes
        const notes = this.capabilities.isMobile ? chord.notes.slice(0, 2) : chord.notes;

        notes.forEach((noteIdx, i) => {
            setTimeout(() => {
                const freq = scale[noteIdx % scale.length];
                const vol = this.capabilities.isMobile ? 0.04 : 0.06;
                this.playStringNote(freq, vol, 1.8);
            }, i * 40);
        });
    }

    playStringNote(freq, volume, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 1500;
        filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.3);

        gain.gain.value = 0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverbNode.convolver);
        gain.connect(this.compressor);

        osc.start();

        const now = this.ctx.currentTime;
        gain.gain.linearRampToValueAtTime(volume, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.stop(now + duration + 0.1);
    }

    playCenterPad() {
        if (!this.isInitialized) return;

        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];

        // Mobile: simpler center pad
        const frequencies = this.capabilities.isMobile
            ? [scale[0] / 2, scale[4] / 2]
            : [scale[0] / 4, scale[0] / 2, scale[4] / 2, scale[2]];

        frequencies.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 300 + i * 100;

            gain.gain.value = 0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverbNode.convolver);
            gain.connect(this.compressor);

            osc.start();

            const now = this.ctx.currentTime;
            const vol = 0.03 / (i + 1);
            gain.gain.linearRampToValueAtTime(vol, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.stop(now + 2.6);
        });
    }

    addNightLayer() {
        if (!this.isInitialized || this.layers.night) return;
        if (this.capabilities.isMobile) return; // Skip on mobile

        const droneNotes = [this.currentScale[0] / 8, this.currentScale[4] / 8];

        this.layers.night = droneNotes.map(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 100;

            gain.gain.value = 0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.compressor);

            osc.start();

            gain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 15);

            return { osc, gain, filter };
        });
    }

    stopAmbientPad() {
        if (!this.isPlaying) return;
        this.isPlaying = false;

        if (this.arpeggioInterval) clearInterval(this.arpeggioInterval);
        if (this.arpeggioTimeout) clearTimeout(this.arpeggioTimeout);

        const fadeTime = this.ctx.currentTime + 3;

        Object.values(this.layers).forEach(layer => {
            if (!layer) return;
            if (Array.isArray(layer)) {
                layer.forEach(l => {
                    if (l.gain) l.gain.gain.linearRampToValueAtTime(0, fadeTime);
                    if (l.osc1) l.osc1.stop(fadeTime + 0.1);
                    if (l.osc2) l.osc2.stop(fadeTime + 0.1);
                    if (l.osc) l.osc.stop(fadeTime + 0.1);
                });
            } else {
                if (layer.gain) layer.gain.gain.linearRampToValueAtTime(0, fadeTime);
                if (layer.noise) layer.noise.stop(fadeTime + 0.1);
                if (layer.osc) layer.osc.stop(fadeTime + 0.1);
            }
        });
    }

    getIntensity() {
        return this.intensity;
    }

    setVolume(value) {
        if (this.masterGain) {
            const targetVol = value * AUDIO.masterVolume * (this.capabilities?.isMobile ? 0.5 : 0.75);
            this.masterGain.gain.linearRampToValueAtTime(targetVol, this.ctx.currentTime + 0.15);
        }
    }

    dispose() {
        this.stopAmbientPad();
        if (this.ctx) {
            this.ctx.close();
        }
    }
}
