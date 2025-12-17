/**
 * AudioLayer Module - EXTENDED ORCHESTRAL VERSION
 * Rich generative music with longer progression, multiple scales, and varied instruments
 */

import { AUDIO, Utils } from '../config.js';

export class AudioLayer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.compressor = null;
        this.reverbNode = null;
        this.isInitialized = false;
        this.isPlaying = false;

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
        this.musicTime = 0;
        this.chordChangeTime = 0;

        // Extended scales (modes for variety)
        this.scales = {
            lydian: [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25],
            dorian: [261.63, 293.66, 311.13, 349.23, 392.00, 440.00, 466.16, 523.25],
            mixolydian: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25],
            pentatonic: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]
        };
        this.currentScale = this.scales.lydian;

        // Extended chord progressions
        this.progressions = [
            // Section A - Dreamy (Lydian)
            { scale: 'lydian', root: 0, type: 'maj7', notes: [0, 2, 4, 6] },
            { scale: 'lydian', root: 4, type: 'maj', notes: [4, 6, 1] },
            { scale: 'lydian', root: 2, type: 'min7', notes: [2, 4, 6, 1] },
            { scale: 'lydian', root: 5, type: 'sus4', notes: [5, 0, 1] },
            // Section B - Melancholic (Dorian)
            { scale: 'dorian', root: 0, type: 'min7', notes: [0, 2, 4, 6] },
            { scale: 'dorian', root: 3, type: 'maj', notes: [3, 5, 7] },
            { scale: 'dorian', root: 5, type: 'min', notes: [5, 7, 2] },
            { scale: 'dorian', root: 6, type: 'maj', notes: [6, 1, 3] },
            // Section C - Warm (Mixolydian)
            { scale: 'mixolydian', root: 0, type: 'maj', notes: [0, 2, 4] },
            { scale: 'mixolydian', root: 6, type: 'maj', notes: [6, 1, 3] },
            { scale: 'mixolydian', root: 4, type: 'min', notes: [4, 6, 1] },
            { scale: 'mixolydian', root: 2, type: 'add9', notes: [2, 4, 6, 3] }
        ];

        // Arpeggio patterns
        this.arpPatterns = [
            [0, 2, 4, 5, 4, 2],           // Up-down
            [0, 4, 2, 5, 4, 7, 5, 4],     // Wave
            [0, 2, 4, 7, 4, 2, 0, -1],    // Extended up-down
            [7, 5, 4, 2, 0, 2, 4, 5]      // Down-up
        ];
    }

    async init() {
        if (this.isInitialized) return true;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            // Dynamics compressor
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.knee.value = 25;
            this.compressor.ratio.value = 8;
            this.compressor.attack.value = 0.005;
            this.compressor.release.value = 0.2;

            // Master gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = AUDIO.masterVolume * 0.75;

            // Create lush reverb
            this.reverbNode = await this.createLushReverb();

            // Connect chain
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);

            this.isInitialized = true;
            return true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
            return false;
        }
    }

    async createLushReverb() {
        const convolver = this.ctx.createConvolver();
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 4; // 4 second reverb
        const impulse = this.ctx.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const t = i / length;
                const decay = Math.exp(-2.5 * t) * 0.65 +
                    Math.exp(-1.2 * t) * 0.25 +
                    Math.exp(-0.4 * t) * 0.1;
                const noise = (Math.random() * 2 - 1);
                const early = i < sampleRate * 0.06 ? Math.sin(i * 0.12) * 0.25 : 0;
                data[i] = (noise * decay + early) * 0.45;
            }
        }

        convolver.buffer = impulse;

        const wetGain = this.ctx.createGain();
        wetGain.gain.value = 0.38;

        convolver.connect(wetGain);
        wetGain.connect(this.compressor);

        return { convolver, wetGain };
    }

    // ═══════════════════════════════════════════════════════
    // ORCHESTRAL LAYERS
    // ═══════════════════════════════════════════════════════

    startAmbientPad() {
        if (!this.isInitialized) return;
        this.isPlaying = true;

        this.startStringsLayer();
        this.startPadLayer();
        this.startBassLayer();
        this.startArpeggiator();
        this.startNatureLayer();
        this.startBreathing();
        this.startChordProgression();
    }

    // Warm string ensemble with multiple voices
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
            const osc3 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            const vibrato = this.ctx.createOscillator();
            const vibratoGain = this.ctx.createGain();

            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc3.type = 'triangle';
            osc1.frequency.value = freq;
            osc2.frequency.value = freq * 1.002;
            osc3.frequency.value = freq * 0.998;

            vibrato.type = 'sine';
            vibrato.frequency.value = 4.5 + Math.random() * 1.5;
            vibratoGain.gain.value = freq * 0.0025;
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc1.frequency);
            vibratoGain.connect(osc2.frequency);

            filter.type = 'lowpass';
            filter.frequency.value = 1000;
            filter.Q.value = 0.8;

            gain.gain.value = 0;

            const mixer = this.ctx.createGain();
            mixer.gain.value = 0.4;

            osc1.connect(mixer);
            osc2.connect(mixer);
            osc3.connect(mixer);
            mixer.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverbNode.convolver);
            gain.connect(this.compressor);

            osc1.start();
            osc2.start();
            osc3.start();
            vibrato.start();

            const delay = i * 0.6;
            gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + delay + 5);

            return { osc1, osc2, osc3, gain, filter, vibrato, vibratoGain, baseFreq: freq };
        });
    }

    // Ethereal pad layer
    startPadLayer() {
        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];
        const chordNotes = chord.notes;

        this.layers.pad = chordNotes.map((noteIdx, i) => {
            const freq = scale[noteIdx % scale.length] / 2;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 500;
            filter.Q.value = 1.2;

            gain.gain.value = 0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverbNode.convolver);

            osc.start();

            gain.gain.linearRampToValueAtTime(0.025, this.ctx.currentTime + 6);

            return { osc, gain, filter, baseFreq: freq };
        });
    }

    // Deep bass layer
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

        gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 4);

        this.layers.bass = { osc, gain, filter, baseFreq: bassFreq };
    }

    // Extended arpeggiator with pattern changes
    startArpeggiator() {
        this.currentArpPattern = 0;
        const pattern = this.arpPatterns[this.currentArpPattern];
        let noteIndex = 0;

        const beatTime = 60 / this.tempo;
        const noteInterval = beatTime / 2;

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

                this.playHarpNote(freq, 0.04, 2.5);
            }

            noteIndex = (noteIndex + 1) % (pattern.length * 2);

            // Change pattern every 16 notes
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

    // Harp note with natural decay
    playHarpNote(freq, volume, duration) {
        if (!this.isInitialized) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 2500;
        filter.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.4);

        gain.gain.value = 0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.reverbNode.convolver);
        gain.connect(this.compressor);

        osc.start();

        const now = this.ctx.currentTime;
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(volume * 0.25, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.stop(now + duration + 0.1);
    }

    // Nature ambient
    startNatureLayer() {
        const bufferSize = this.ctx.sampleRate * 3;
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

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08;
        lfoGain.gain.value = 180;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        noise.start();
        lfo.start();

        gain.gain.linearRampToValueAtTime(0.012, this.ctx.currentTime + 8);

        this.layers.nature = { noise, filter, gain, lfo, lfoGain };
    }

    // Chord progression over time (changes every 12 seconds)
    startChordProgression() {
        const changeChord = () => {
            if (!this.isPlaying) return;

            this.currentChord = (this.currentChord + 1) % this.progressions.length;
            this.updateLayersToChord();

            // Schedule next change (10-14 seconds)
            const nextChange = 10000 + Math.random() * 4000;
            setTimeout(changeChord, nextChange);
        };

        // First chord change after 12 seconds
        setTimeout(changeChord, 12000);
    }

    updateLayersToChord() {
        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];
        this.currentScale = scale;

        const transitionTime = 3;
        const now = this.ctx.currentTime;

        // Update strings
        if (this.layers.strings) {
            const stringNotes = [scale[0] / 2, scale[4] / 2, scale[0], scale[2]];
            this.layers.strings.forEach((s, i) => {
                const newFreq = stringNotes[i % stringNotes.length];
                s.osc1.frequency.linearRampToValueAtTime(newFreq, now + transitionTime);
                s.osc2.frequency.linearRampToValueAtTime(newFreq * 1.002, now + transitionTime);
                s.osc3.frequency.linearRampToValueAtTime(newFreq * 0.998, now + transitionTime);
            });
        }

        // Update bass
        if (this.layers.bass) {
            const bassFreq = scale[chord.root] / 4;
            this.layers.bass.osc.frequency.linearRampToValueAtTime(bassFreq, now + transitionTime);
        }

        // Update pad
        if (this.layers.pad) {
            chord.notes.forEach((noteIdx, i) => {
                if (this.layers.pad[i]) {
                    const freq = scale[noteIdx % scale.length] / 2;
                    this.layers.pad[i].osc.frequency.linearRampToValueAtTime(freq, now + transitionTime);
                }
            });
        }
    }

    // Breathing intensity modulation
    startBreathing() {
        const breathe = () => {
            if (!this.isPlaying) return;

            this.breathPhase += 0.018;
            const breath = (Math.sin(this.breathPhase) + 1) * 0.5;

            if (this.layers.strings) {
                this.layers.strings.forEach(s => {
                    const targetFreq = 700 + breath * 500;
                    s.filter.frequency.linearRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.15);
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

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        osc1.type = 'sine';
        osc1.frequency.value = freq;
        osc2.type = 'sine';
        osc2.frequency.value = freq * 3;

        panner.pan.value = Utils.clamp(pan, -0.7, 0.7);

        const mix = this.ctx.createGain();
        mix.gain.value = 0.65;

        const mix2 = this.ctx.createGain();
        mix2.gain.value = 0.12;

        osc1.connect(mix);
        osc2.connect(mix2);
        mix.connect(gain);
        mix2.connect(gain);
        gain.connect(panner);
        panner.connect(this.reverbNode.convolver);
        panner.connect(this.compressor);

        gain.gain.value = 0;

        osc1.start();
        osc2.start();

        const now = this.ctx.currentTime;
        gain.gain.linearRampToValueAtTime(0.05, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc1.stop(now + 2);
        osc2.stop(now + 2);
    }

    playClickChord(pan = 0) {
        if (!this.isInitialized) return;

        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];

        chord.notes.forEach((noteIdx, i) => {
            setTimeout(() => {
                const freq = scale[noteIdx % scale.length];
                this.playStringNote(freq, 0.07, 2.2, pan);
            }, i * 35);
        });

        const bassFreq = scale[chord.root] / 2;
        this.playStringNote(bassFreq, 0.05, 2.8, 0);
    }

    playStringNote(freq, volume, duration, pan) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const panner = this.ctx.createStereoPanner();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.value = freq;
        osc2.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 1800;
        filter.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.35);

        panner.pan.value = Utils.clamp(pan, -1, 1);

        const mix = this.ctx.createGain();
        mix.gain.value = 0.55;

        const mix2 = this.ctx.createGain();
        mix2.gain.value = 0.45;

        osc1.connect(mix);
        osc2.connect(mix2);
        mix.connect(filter);
        mix2.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.reverbNode.convolver);
        panner.connect(this.compressor);

        gain.gain.value = 0;

        osc1.start();
        osc2.start();

        const now = this.ctx.currentTime;
        gain.gain.linearRampToValueAtTime(volume, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(volume * 0.35, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.stop(now + duration + 0.1);
        osc2.stop(now + duration + 0.1);
    }

    playCenterPad() {
        if (!this.isInitialized) return;

        const chord = this.progressions[this.currentChord];
        const scale = this.scales[chord.scale];

        const frequencies = [
            scale[0] / 4,
            scale[0] / 2,
            scale[4] / 2,
            scale[2]
        ];

        frequencies.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = i < 2 ? 'sawtooth' : 'triangle';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 350 + i * 180;
            filter.frequency.linearRampToValueAtTime(180 + i * 80, this.ctx.currentTime + 2.5);

            gain.gain.value = 0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.reverbNode.convolver);
            gain.connect(this.compressor);

            osc.start();

            const now = this.ctx.currentTime;
            const vol = 0.045 / (i + 1);
            gain.gain.linearRampToValueAtTime(vol, now + 0.35);
            gain.gain.linearRampToValueAtTime(vol * 0.55, now + 1.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

            osc.stop(now + 3.6);
        });

        this.playShimmer();
    }

    playShimmer() {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const freq = this.currentScale[Utils.randomInt(4, 7) % this.currentScale.length] * 2;
                this.playHarpNote(freq, 0.025, 1.8);
            }, i * 120);
        }
    }

    addNightLayer() {
        if (!this.isInitialized || this.layers.night) return;

        const droneNotes = [
            this.currentScale[0] / 8,
            this.currentScale[4] / 8,
            this.currentScale[0] / 4
        ];

        this.layers.night = droneNotes.map(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 120;

            gain.gain.value = 0;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.compressor);

            osc.start();

            gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 18);

            return { osc, gain, filter };
        });
    }

    stopAmbientPad() {
        if (!this.isPlaying) return;
        this.isPlaying = false;

        if (this.arpeggioInterval) clearInterval(this.arpeggioInterval);
        if (this.arpeggioTimeout) clearTimeout(this.arpeggioTimeout);

        const fadeTime = this.ctx.currentTime + 4;

        Object.values(this.layers).forEach(layer => {
            if (!layer) return;
            if (Array.isArray(layer)) {
                layer.forEach(l => {
                    if (l.gain) l.gain.gain.linearRampToValueAtTime(0, fadeTime);
                    if (l.osc1) l.osc1.stop(fadeTime + 0.1);
                    if (l.osc2) l.osc2.stop(fadeTime + 0.1);
                    if (l.osc3) l.osc3.stop(fadeTime + 0.1);
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
            this.masterGain.gain.linearRampToValueAtTime(
                value * AUDIO.masterVolume * 0.75,
                this.ctx.currentTime + 0.15
            );
        }
    }

    dispose() {
        this.stopAmbientPad();
        if (this.ctx) {
            this.ctx.close();
        }
    }
}
