import * as Tone from 'tone';

export type Weather = 'clear' | 'rain' | 'thunder' | 'snow' | 'fog';

/**
 * AudioLayer manages all ambient music, weather SFX, and interaction sounds.
 * It adapts the soundtrack to weather and day/night cycles, and ducks SFX
 * when interaction sounds are triggered.
 */
export class AudioLayer {
  /* ─── State ─── */
  #initialized = false;
  #disposed = false;
  #isPlaying = false;
  #weather: Weather = 'clear';
  #isNight = false;
  #isDucked = false;

  /* ─── Master Chain ─── */
  #masterVol: Tone.Volume;
  #musicVol: Tone.Volume;
  #musicReverb: Tone.Reverb | null = null;
  #interactionVol: Tone.Volume;
  #sfxBusVol: Tone.Volume; // all SFX pre-duck
  #sfxDuckVol: Tone.Volume; // post-duck -> master

  /* ─── Ambient Music ─── */
  #padSynth: Tone.PolySynth<Tone.AMSynth> | null = null;
  #padFilter: Tone.Filter | null = null;
  #currentPadNotes: string[] = ['C4', 'E4', 'G4', 'B4'];
  #activePadNotes: string[] = [];

  #arpeggioSynth: Tone.Synth | null = null;
  #arpeggioFilter: Tone.Filter | null = null;
  #arpeggioLoop: Tone.Loop | null = null;
  #arpeggioIndex = 0;

  /* ─── Weather SFX ─── */
  #windNoise: Tone.Noise | null = null;
  #windFilter: Tone.AutoFilter | null = null;
  #windVol: Tone.Volume | null = null;

  #rainNoise: Tone.Noise | null = null;
  #rainFilter: Tone.Filter | null = null;
  #rainVol: Tone.Volume | null = null;

  #thunderSynth: Tone.MembraneSynth | null = null;
  #thunderVol: Tone.Volume | null = null;
  #thunderLoop: Tone.Loop | null = null;

  /* ─── Nature SFX ─── */
  #birdSynth: Tone.AMSynth | null = null;
  #birdVol: Tone.Volume | null = null;
  #birdLoop: Tone.Loop | null = null;

  #cricketSynth: Tone.AMSynth | null = null;
  #cricketVol: Tone.Volume | null = null;
  #cricketLoop: Tone.Loop | null = null;

  #owlSynth: Tone.AMSynth | null = null;
  #owlVol: Tone.Volume | null = null;
  #owlLoop: Tone.Loop | null = null;

  #butterflySynth: Tone.AMSynth | null = null;
  #butterflyVol: Tone.Volume | null = null;
  #butterflyLoop: Tone.Loop | null = null;

  #beeSynth: Tone.AMSynth | null = null;
  #beeVol: Tone.Volume | null = null;
  #beeLoop: Tone.Loop | null = null;

  // Reusable interaction synths to prevent node buildup on rapid clicks
  #bellSynth: Tone.Synth | null = null;
  #chordSynth: Tone.PolySynth | null = null;
  #padHitSynth: Tone.PolySynth | null = null;

  #intensity = 0;
  #breathPhase = 0;
  #breatheRaf = 0;

  get intensity() { return this.#intensity; }

  constructor() {
    this.#masterVol = new Tone.Volume(0).toDestination();
    this.#musicVol = new Tone.Volume(-10).connect(this.#masterVol);
    this.#interactionVol = new Tone.Volume(-6).connect(this.#masterVol);

    // SFX ducking chain: all SFX -> sfxBusVol -> sfxDuckVol -> masterVol
    this.#sfxBusVol = new Tone.Volume(0);
    this.#sfxDuckVol = new Tone.Volume(0).connect(this.#masterVol);
    this.#sfxBusVol.connect(this.#sfxDuckVol);
  }

  /* ═══════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════ */

  async init(): Promise<void> {
    if (this.#initialized || this.#disposed) return;
    await Tone.start();
    this.#initialized = true;

    this.#buildMusicNodes();
    this.#buildSfxNodes();
    this.#buildInteractionNodes();
    this.#applyWeatherAndTime();
  }

  startAmbientPad(): void {
    if (!this.#initialized || this.#disposed || this.#isPlaying) return;
    this.#isPlaying = true;

    Tone.Transport.start();

    // Pad chord
    if (this.#padSynth) {
      this.#activePadNotes = [...this.#currentPadNotes];
      this.#padSynth.triggerAttack(this.#activePadNotes);
    }

    // Loops
    this.#arpeggioLoop?.start(0);
    this.#birdLoop?.start(0);
    this.#cricketLoop?.start(0);
    this.#owlLoop?.start(0);
    this.#butterflyLoop?.start(0);
    this.#beeLoop?.start(0);
    this.#thunderLoop?.start(0);

    // Continuous noise sources
    this.#windNoise?.start();
    this.#rainNoise?.start();

    this.#startBreathing();
  }

  stopAmbientPad(): void {
    if (!this.#isPlaying) return;
    this.#isPlaying = false;

    this.#padSynth?.triggerRelease(this.#activePadNotes);
    this.#activePadNotes = [];

    this.#arpeggioLoop?.stop();
    this.#birdLoop?.stop();
    this.#cricketLoop?.stop();
    this.#owlLoop?.stop();
    this.#butterflyLoop?.stop();
    this.#beeLoop?.stop();
    this.#thunderLoop?.stop();

    this.#windNoise?.stop();
    this.#rainNoise?.stop();

    Tone.Transport.stop();
    cancelAnimationFrame(this.#breatheRaf);
  }

  #buildInteractionNodes(): void {
    if (this.#disposed) return;
    this.#bellSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 1.5 },
      volume: -12,
    }).connect(this.#interactionVol);
    this.#chordSynth = new Tone.PolySynth(Tone.Synth, {
      volume: -10,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 1 },
    }).connect(this.#interactionVol);
    this.#padHitSynth = new Tone.PolySynth(Tone.AMSynth, {
      volume: -8,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.6, release: 2 },
    }).connect(this.#interactionVol);
  }

  playHoverBell(_pan = 0) {
    this.#triggerInteraction();
    if (!this.#initialized || !this.#bellSynth) return;
    const note = this.#isNight ? 'G5' : 'C6';
    this.#bellSynth.triggerAttackRelease(note, '8n');
  }

  playClickChord(_pan = 0) {
    this.#triggerInteraction();
    if (!this.#initialized || !this.#chordSynth) return;
    const notes = this.#isNight ? ['C4', 'E4', 'G4'] : ['C5', 'E5', 'G5', 'B5'];
    this.#chordSynth.triggerAttackRelease(notes, '8n');
  }

  playCenterPad() {
    this.#triggerInteraction();
    if (!this.#initialized || !this.#padHitSynth) return;
    const notes = this.#isNight ? ['F3', 'A3', 'C4'] : ['C4', 'E4', 'G4', 'C5'];
    this.#padHitSynth.triggerAttackRelease(notes, '2n');
  }

  setVolume(value: number): void {
    if (this.#disposed) return;
    const db = Tone.gainToDb(Math.max(0, Math.min(1, value)));
    this.#masterVol.volume.rampTo(db, 0.1);
  }

  setWeather(weather: Weather): void {
    this.#weather = weather;
    this.#applyWeatherAndTime();
  }

  setNightMode(isNight: boolean): void {
    this.#isNight = isNight;
    this.#applyWeatherAndTime();
  }

  dispose() {
    this.stopAmbientPad();
    if (this.#disposed) return;
    this.#disposed = true;
    this.#initialized = false;

    /* Music */
    this.#padSynth?.dispose();
    this.#padFilter?.dispose();
    this.#arpeggioSynth?.dispose();
    this.#arpeggioFilter?.dispose();
    this.#arpeggioLoop?.dispose();
    this.#musicReverb?.dispose();

    /* Weather SFX */
    this.#windNoise?.dispose();
    this.#windFilter?.dispose();
    this.#windVol?.dispose();
    this.#rainNoise?.dispose();
    this.#rainFilter?.dispose();
    this.#rainVol?.dispose();
    this.#thunderSynth?.dispose();
    this.#thunderVol?.dispose();
    this.#thunderLoop?.dispose();

    /* Nature SFX */
    this.#birdSynth?.dispose();
    this.#birdVol?.dispose();
    this.#birdLoop?.dispose();
    this.#cricketSynth?.dispose();
    this.#cricketVol?.dispose();
    this.#cricketLoop?.dispose();
    this.#owlSynth?.dispose();
    this.#owlVol?.dispose();
    this.#owlLoop?.dispose();
    this.#butterflySynth?.dispose();
    this.#butterflyVol?.dispose();
    this.#butterflyLoop?.dispose();
    this.#beeSynth?.dispose();
    this.#beeVol?.dispose();
    this.#beeLoop?.dispose();

    /* Interaction */
    this.#bellSynth?.dispose();
    this.#chordSynth?.dispose();
    this.#padHitSynth?.dispose();

    /* Master */
    this.#sfxBusVol.dispose();
    this.#sfxDuckVol.dispose();
    this.#musicVol.dispose();
    this.#interactionVol.dispose();
    this.#masterVol.dispose();
  }

  /* ═══════════════════════════════════════════
     PRIVATE HELPERS
     ═══════════════════════════════════════════ */

  #buildMusicNodes(): void {
    if (this.#disposed) return;

    // Shared reverb for ambient music
    this.#musicReverb = new Tone.Reverb({ decay: 4, wet: 0.35 }).connect(this.#musicVol);

    // Pad
    this.#padFilter = new Tone.Filter(800, 'lowpass').connect(this.#musicReverb);
    this.#padSynth = new Tone.PolySynth(Tone.AMSynth, {
      volume: -12,
      oscillator: { type: 'sine' },
      envelope: { attack: 2, decay: 1, sustain: 0.8, release: 3 },
    }).connect(this.#padFilter);

    // Arpeggio
    this.#arpeggioFilter = new Tone.Filter(1200, 'lowpass').connect(this.#musicReverb);
    this.#arpeggioSynth = new Tone.Synth({
      volume: -16,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.8 },
    }).connect(this.#arpeggioFilter);

    this.#arpeggioLoop = new Tone.Loop((time) => {
      if (!this.#arpeggioSynth || !this.#isPlaying) return;
      const notes = this.#currentPadNotes;
      if (notes.length === 0) return;
      const note = notes[this.#arpeggioIndex % notes.length];
      // Use Tone.now() + offset to avoid "start time must be strictly greater" error
      this.#arpeggioSynth.triggerAttackRelease(note, '16n', Tone.now() + 0.01);
      this.#arpeggioIndex++;
    }, '8n');
  }

  #buildSfxNodes(): void {
    if (this.#disposed) return;

    /* ── Wind ── */
    this.#windVol = new Tone.Volume(-22).connect(this.#sfxBusVol);
    this.#windFilter = new Tone.AutoFilter({
      frequency: 0.1,
      baseFrequency: 200,
      octaves: 2.5,
      depth: 0.8,
      type: 'sine',
    }).connect(this.#windVol);
    this.#windNoise = new Tone.Noise('pink').connect(this.#windFilter);
    this.#windFilter.start();

    /* ── Rain ── */
    this.#rainVol = new Tone.Volume(-60).connect(this.#sfxBusVol); // start silent
    this.#rainFilter = new Tone.Filter(800, 'lowpass').connect(this.#rainVol);
    this.#rainNoise = new Tone.Noise('brown').connect(this.#rainFilter);

    /* ── Thunder ── */
    this.#thunderVol = new Tone.Volume(-60).connect(this.#sfxBusVol); // start silent
    this.#thunderSynth = new Tone.MembraneSynth({
      volume: 0,
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.8, sustain: 0.01, release: 1.4 },
    }).connect(this.#thunderVol);

    this.#thunderLoop = new Tone.Loop((time) => {
      if (!this.#thunderSynth || !this.#isPlaying) return;
      if (this.#weather !== 'thunder') return;
      if (Math.random() > 0.75) {
        const now = Tone.now() + 0.01;
        this.#thunderSynth.triggerAttackRelease('C1', '2n', now);
        this.#thunderSynth.triggerAttackRelease('A0', '1n', now + 0.15, 0.4);
      }
    }, '1m');

    /* ── Birds (day only) ── */
    this.#birdVol = new Tone.Volume(-18).connect(this.#sfxBusVol);
    this.#birdSynth = new Tone.AMSynth({
      volume: 0,
      harmonicity: 2.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
    }).connect(this.#birdVol);

    this.#birdLoop = new Tone.Loop((time) => {
      if (!this.#birdSynth || !this.#isPlaying || this.#isNight) return;
      if (Math.random() > 0.55) {
        const freq = 900 + Math.random() * 1100;
        const now = Tone.now() + 0.01;
        this.#birdSynth.triggerAttackRelease(freq, '32n', now);
        if (Math.random() > 0.5) {
          this.#birdSynth.triggerAttackRelease(freq + 120, '32n', now + 0.07);
        }
      }
    }, '2n');

    /* ── Crickets (night only) ── */
    this.#cricketVol = new Tone.Volume(-22).connect(this.#sfxBusVol);
    this.#cricketSynth = new Tone.AMSynth({
      volume: 0,
      harmonicity: 3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.05 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.05 },
    }).connect(this.#cricketVol);

    this.#cricketLoop = new Tone.Loop((time) => {
      if (!this.#cricketSynth || !this.#isPlaying || !this.#isNight) return;
      if (Math.random() > 0.35) {
        const freq = 3200 + Math.random() * 900;
        const now = Tone.now() + 0.01;
        this.#cricketSynth.triggerAttackRelease(freq, '64n', now);
        this.#cricketSynth.triggerAttackRelease(freq, '64n', now + 0.05);
        this.#cricketSynth.triggerAttackRelease(freq, '64n', now + 0.1);
      }
    }, '4n');

    /* ── Owl (night only) ── */
    this.#owlVol = new Tone.Volume(-16).connect(this.#sfxBusVol);
    this.#owlSynth = new Tone.AMSynth({
      volume: 0,
      harmonicity: 1.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.12, decay: 0.3, sustain: 0.4, release: 0.6 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.12, decay: 0.3, sustain: 0.4, release: 0.6 },
    }).connect(this.#owlVol);

    this.#owlLoop = new Tone.Loop((time) => {
      if (!this.#owlSynth || !this.#isPlaying || !this.#isNight) return;
      if (Math.random() > 0.65) {
        const freq = 380 + Math.random() * 90;
        const now = Tone.now() + 0.01;
        this.#owlSynth.triggerAttackRelease(freq, '8n', now);
        this.#owlSynth.triggerAttackRelease(freq - 35, '8n', now + 0.45);
      }
    }, '2m');

    /* ── Butterfly (day only) ── */
    this.#butterflyVol = new Tone.Volume(-24).connect(this.#sfxBusVol);
    this.#butterflySynth = new Tone.AMSynth({
      volume: 0,
      harmonicity: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.08 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.08 },
    }).connect(this.#butterflyVol);

    this.#butterflyLoop = new Tone.Loop((time) => {
      if (!this.#butterflySynth || !this.#isPlaying || this.#isNight) return;
      if (Math.random() > 0.5) {
        const freq = 2200 + Math.random() * 1200;
        this.#butterflySynth.triggerAttackRelease(freq, '32n', Tone.now() + 0.01);
      }
    }, '8n');

    /* ── Bee (day only) ── */
    this.#beeVol = new Tone.Volume(-20).connect(this.#sfxBusVol);
    this.#beeSynth = new Tone.AMSynth({
      volume: 0,
      harmonicity: 4,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
      modulation: { type: 'square' },
      modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
    }).connect(this.#beeVol);

    this.#beeLoop = new Tone.Loop((time) => {
      if (!this.#beeSynth || !this.#isPlaying || this.#isNight) return;
      if (Math.random() > 0.35) {
        const freq = 240 + Math.random() * 120;
        this.#beeSynth.triggerAttackRelease(freq, '16n', Tone.now() + 0.01);
      }
    }, '16n');
  }

  #applyWeatherAndTime(): void {
    if (!this.#initialized || this.#disposed) return;

    /* ── BPM ── */
    const dayBpm = this.#weather === 'clear' ? 88 : 76;
    const nightBpm = this.#weather === 'clear' ? 58 : 50;
    const targetBpm = this.#isNight ? nightBpm : dayBpm;
    Tone.Transport.bpm.rampTo(targetBpm, 2);

    /* ── Pad Chords ── */
    const oldNotes = [...this.#currentPadNotes];
    if (this.#weather === 'rain' || this.#weather === 'thunder' || this.#weather === 'fog') {
      this.#currentPadNotes = this.#isNight
        ? ['A3', 'C4', 'E4', 'A4'] // Amin (low, sombre)
        : ['A3', 'C4', 'E4', 'G4']; // Amin7
    } else if (this.#weather === 'snow') {
      this.#currentPadNotes = this.#isNight
        ? ['D4', 'F4', 'A4', 'D5'] // Dmin (open, cold)
        : ['C4', 'E4', 'G4', 'B4']; // Cmaj7
    } else {
      // clear
      this.#currentPadNotes = this.#isNight
        ? ['C4', 'E4', 'G4', 'C5'] // Cmaj (warm)
        : ['C4', 'E4', 'G4', 'B4']; // Cmaj7 (bright)
    }

    // Retrigger pad if already playing so the harmony shifts
    if (this.#isPlaying && this.#padSynth && oldNotes.length > 0) {
      this.#padSynth.triggerRelease(oldNotes);
      this.#activePadNotes = [...this.#currentPadNotes];
      this.#padSynth.triggerAttack(this.#activePadNotes);
    }

    /* ── Filters ── */
    const padFreq = this.#isNight ? 500 : this.#weather === 'clear' ? 1600 : 900;
    this.#padFilter?.frequency.rampTo(padFreq, 2);

    const arpFreq = this.#isNight ? 600 : this.#weather === 'clear' ? 2200 : 1100;
    this.#arpeggioFilter?.frequency.rampTo(arpFreq, 2);

    /* ── Arpeggio Speed ── */
    if (this.#arpeggioLoop) {
      this.#arpeggioLoop.interval =
        this.#weather === 'rain' || this.#weather === 'thunder' ? '4n' : '8n';
    }

    /* ── SFX Levels ── */
    // Wind
    const windDb =
      this.#weather === 'thunder' || this.#weather === 'rain'
        ? -14
        : this.#weather === 'snow'
        ? -18
        : -24;
    this.#windVol?.volume.rampTo(windDb, 2);

    // Rain
    const rainDb = this.#weather === 'rain' || this.#weather === 'thunder' ? -12 : -60;
    this.#rainVol?.volume.rampTo(rainDb, 2);

    // Thunder
    const thunderDb = this.#weather === 'thunder' ? -6 : -60;
    this.#thunderVol?.volume.rampTo(thunderDb, 2);

    // Nature loops (mute when not in correct time/weather)
    const birdDb = this.#isNight || this.#weather === 'thunder' || this.#weather === 'rain' ? -60 : -18;
    this.#birdVol?.volume.rampTo(birdDb, 2);

    const cricketDb = this.#isNight ? -20 : -60;
    this.#cricketVol?.volume.rampTo(cricketDb, 2);

    const owlDb = this.#isNight ? -16 : -60;
    this.#owlVol?.volume.rampTo(owlDb, 2);

    const butterflyDb = this.#isNight ? -60 : -22;
    this.#butterflyVol?.volume.rampTo(butterflyDb, 2);

    const beeDb = this.#isNight ? -60 : -20;
    this.#beeVol?.volume.rampTo(beeDb, 2);
  }

  #triggerInteraction(): void {
    if (!this.#sfxDuckVol || this.#isDucked) return;
    this.#isDucked = true;
    this.#sfxDuckVol.volume.rampTo(-14, 0.05);

    setTimeout(() => {
      this.#sfxDuckVol?.volume.rampTo(0, 0.4);
      this.#isDucked = false;
    }, 300);
  }

  #startBreathing() {
    const breathe = () => {
      if (!this.#isPlaying) return;
      this.#breathPhase += 0.015;
      this.#intensity = (Math.sin(this.#breathPhase) + 1) * 0.5;
      this.#breatheRaf = requestAnimationFrame(breathe);
    };
    this.#breatheRaf = requestAnimationFrame(breathe);
  }
}
