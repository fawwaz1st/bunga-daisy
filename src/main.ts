import { getDeviceCapabilities, Utils, type DeviceCapabilities, type Vec2 } from './config.js';
import { generateFlowerParams } from './utils/FlowerParams.js';
import { TimeManager } from './utils/TimeManager.js';
import { EventBus } from './utils/EventBus.js';
import { BackgroundParallax } from './modules/BackgroundParallax.js';
import { WindField } from './modules/WindField.js';
import { ParticleSystem } from './modules/ParticleSystem.js';
import { DaisyFlower } from './modules/DaisyFlower.js';
import { PollenTrail } from './modules/PollenTrail.js';
import { AudioLayer } from './modules/AudioLayer.js';
import { EntranceAnimation } from './modules/EntranceAnimation.js';
import { StateManager } from './modules/StateManager.js';
import { InputHandler } from './modules/InputHandler.js';
import { BeeSystem } from './modules/BeeSystem.js';
import { PostProcessing } from './modules/PostProcessing.js';
import { WeatherSystem } from './modules/WeatherSystem.js';
import { EventManager } from './modules/EventManager.js';
import { EntityManager } from './modules/EntityManager.js';
import { SeasonManager } from './modules/SeasonManager.js';

class DaisyExperience {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #capabilities: DeviceCapabilities;
  #width = 0;
  #height = 0;

  #background: BackgroundParallax | null = null;
  #wind: WindField | null = null;
  #particles: ParticleSystem | null = null;
  #flower: DaisyFlower | null = null;
  #pollenTrail: PollenTrail | null = null;
  #audio: AudioLayer | null = null;
  #entrance: EntranceAnimation | null = null;
  #stateManager: StateManager | null = null;
  #input: InputHandler | null = null;
  #bees: BeeSystem | null = null;
  #post: PostProcessing | null = null;
  #weather: WeatherSystem | null = null;
  #events: EventManager | null = null;
  #entities: EntityManager | null = null;
  #season: SeasonManager | null = null;

  #isRunning = false;
  #audioPromptVisible = true;
  #lastFrameTime = 0;
  #frameInterval = 1000 / 60;
  #timeManager = new TimeManager();
  #eventBus = new EventBus();
  #abortCtrl = new AbortController();
  #rafId = 0;
  #isPaused = false;
  #reducedMotion = false;
  #keyboardCursor: Vec2 = { x: 0, y: 0 };
  #muted = false;
  #isNight = false;
  #lastWeather: string = 'clear';
  #postFrameSkip = 0;

  constructor() {
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
    this.#capabilities = getDeviceCapabilities();
    this.#reducedMotion = this.#capabilities.prefersReducedMotion;
    this.#frameInterval = 1000 / (this.#capabilities.isLowEnd ? 30 : 60);
  }

  async init() {
    this.#resize();
    const ro = new ResizeObserver(() => this.#resize());
    ro.observe(this.#canvas);
    const origDispose = this.dispose.bind(this);
    this.dispose = () => { ro.disconnect(); origDispose(); };

    this.#background = new BackgroundParallax(this.#ctx, this.#width, this.#height);
    this.#wind = new WindField(this.#width, this.#height);
    this.#particles = new ParticleSystem(this.#ctx, this.#width, this.#height, this.#capabilities);
    this.#pollenTrail = new PollenTrail(this.#ctx, this.#width, this.#height);
    this.#audio = new AudioLayer();
    this.#entrance = new EntranceAnimation();
    this.#stateManager = new StateManager();
    this.#input = new InputHandler(this.#canvas);
    this.#post = new PostProcessing(this.#width, this.#height);
    this.#weather = new WeatherSystem(this.#ctx, this.#width, this.#height);
    this.#events = new EventManager(this.#ctx, this.#width, this.#height);
    this.#entities = new EntityManager(this.#ctx, this.#width, this.#height);
    this.#season = new SeasonManager();
    this.#events.setWeatherSystem(this.#weather);

    const flowerParams = generateFlowerParams();
    const flowerX = this.#width * 0.5;
    const flowerY = this.#height * 0.85;
    const stemHeight = Math.min(this.#height * 0.4, 300);
    const flowerRadius = Math.min(this.#width, this.#height) * 0.12;
    this.#flower = new DaisyFlower(flowerX, flowerY, stemHeight, flowerRadius, flowerParams);
    this.#keyboardCursor = { x: flowerX, y: flowerY - stemHeight };

    this.#bees = new BeeSystem(this.#ctx, this.#width, this.#height);

    this.#setupCallbacks();
    this.#setupVisibility();
    this.#setupKeyboard();
    this.#setupControls();
    this.#setupAudioPrompt();
    this.#setupAnalytics();

    if ('wakeLock' in navigator) {
      try { (navigator as any).wakeLock.request('screen'); } catch (e) {}
    }

    // Auto-trigger random weather after 2 minutes
    setTimeout(() => {
      const weathers: Array<'rain' | 'snow' | 'fog' | 'clear'> = ['rain', 'snow', 'fog', 'clear'];
      const w = weathers[Math.floor(Math.random() * weathers.length)];
      if (w !== 'clear') {
        this.#weather!.setWeather(w);
        this.#announce(`A gentle ${w} begins to fall...`);
      }
    }, 120000);

    const loader = document.getElementById('loader');
    if (loader) requestAnimationFrame(() => loader.classList.add('hidden'));
    this.#drawFrame(0);
  }

  #setupAudioPrompt() {
    const prompt = document.getElementById('audio-prompt')!;
    const btn = document.getElementById('audio-prompt-btn') as HTMLButtonElement;
    const start = async (e: Event) => {
      e.preventDefault();
    const success = await this.#audio!.init();
      prompt.classList.add('hidden');
      this.#audioPromptVisible = false;
      this.#startExperience();
      this.#announce('Experience started. Move your pointer over the flower to interact.');
      this.#logEvent('experience_started', { device: this.#capabilities.isMobile ? 'mobile' : 'desktop', dpr: this.#capabilities.pixelRatio });
      btn.removeEventListener('click', start);
      btn.removeEventListener('touchstart', start);
    };
    btn.addEventListener('click', start);
    btn.addEventListener('touchstart', start, { passive: false });
  }

  #startExperience() {
    this.#audio!.startAmbientPad();
    this.#entrance!.start();
    this.#isRunning = true;
    this.#timeManager.reset();
    this.#lastFrameTime = performance.now();
    this.#rafId = requestAnimationFrame(this.#animate.bind(this));
    this.#showControls();
  }

  #setupCallbacks() {
    this.#entrance!.onStageA(() => this.#particles!.spawnDust(15));
    this.#entrance!.onStageB(() => this.#flower!.startStemGrowth());
    this.#entrance!.onStageC(() => this.#flower!.startFlowerBloom());
    this.#entrance!.onStageD(() => {
      this.#wind!.triggerGust({ x: 1.5, y: 0.2 }, 2000);
      this.#flower!.completeGrowth();
    });

    this.#stateManager!.onIdleStart(() => this.#eventBus.emit('idleStart'));
    this.#stateManager!.onIdleEnd(() => this.#eventBus.emit('idleEnd'));
    this.#stateManager!.onCuriosityStart((x, y) => this.#flower!.setCuriositySide(x, y));
    this.#stateManager!.onCuriosityEnd(() => this.#flower!.resetCuriosity());
    this.#stateManager!.onNightShift((progress) => {
      this.#background!.setNightMode(progress);
      this.#particles!.setNightMode(progress > 0.3);
      this.#isNight = progress > 0.5;
      this.#audio!.setNightMode(this.#isNight);
      if (progress > 0.5) this.#announce('Night falls. Fireflies appear.');
    });

    this.#input!.setCallbacks({
      onMove: (x, y, velocity) => {
        this.#keyboardCursor = { x, y };
        this.#wind!.update(16, x, y);
        this.#pollenTrail!.updateCursor(x, y);
        this.#particles!.updateCursor(x, y);
        if (this.#entrance!.isComplete) {
          const hover = this.#flower!.handleHover(x, y);
          if (hover.petal || hover.center) {
            this.#pollenTrail!.activate();
            if (Math.random() < 0.05 && velocity > 2) {
              this.#audio!.playHoverBell(this.#input!.getPan());
            }
          } else {
            this.#pollenTrail!.deactivate();
          }
        }
      },
      onClick: (x, y) => {
        if (!this.#entrance!.isComplete) return;
        const click = this.#flower!.handleClick(x, y);
        this.#entities?.scare(x, y);
        if (click.center) {
          this.#audio!.playCenterPad();
          this.#particles!.spawnPollenBurst(this.#flower!.getFlowerHeadPosition().x, this.#flower!.getFlowerHeadPosition().y, 20);
          this.#stateManager!.recordInteraction('centerClick', x, y);
          this.#triggerChromaticAbberation();
        } else if (click.petal) {
          this.#audio!.playClickChord(this.#input!.getPan());
          this.#stateManager!.recordInteraction('petalClick', x, y);
        }
        this.#logEvent('interaction', { type: click.center ? 'center' : 'petal', x, y });
      },
      onKeyAction: (action) => {
        switch (action) {
          case 'activate':
            if (this.#audioPromptVisible) {
              document.getElementById('audio-prompt-btn')?.dispatchEvent(new MouseEvent('click'));
            } else {
              const click = this.#flower!.handleClick(this.#keyboardCursor.x, this.#keyboardCursor.y);
              if (click.center) { this.#audio!.playCenterPad(); this.#particles!.spawnPollenBurst(this.#keyboardCursor.x, this.#keyboardCursor.y, 20); }
              else if (click.petal) this.#audio!.playClickChord(0);
            }
            break;
          case 'toggleMute': this.#toggleMute(); break;
          case 'reset': this.#reset(); break;
          case 'up': this.#moveKeyboardCursor(0, -20); break;
          case 'down': this.#moveKeyboardCursor(0, 20); break;
          case 'left': this.#moveKeyboardCursor(-20, 0); break;
          case 'right': this.#moveKeyboardCursor(20, 0); break;
        }
      }
    });
  }

  #moveKeyboardCursor(dx: number, dy: number) {
    this.#keyboardCursor.x = Utils.clamp(this.#keyboardCursor.x + dx, 0, this.#width);
    this.#keyboardCursor.y = Utils.clamp(this.#keyboardCursor.y + dy, 0, this.#height);
    const inp = this.#input as any;
    if (inp?.callbacks?.onMove) inp.callbacks.onMove(this.#keyboardCursor.x, this.#keyboardCursor.y, 0);
  }

  #setupVisibility() {
    const handler = () => {
      if (document.hidden) {
        this.#isPaused = true;
        this.#audio?.setVolume(0);
      } else {
        this.#isPaused = false;
        this.#audio?.setVolume(1);
        this.#lastFrameTime = performance.now();
        if (this.#isRunning) this.#rafId = requestAnimationFrame(this.#animate.bind(this));
      }
      this.#eventBus.emit('visibilityChange', !document.hidden);
    };
    document.addEventListener('visibilitychange', handler, { signal: this.#abortCtrl.signal });
  }

  #setupKeyboard() {
    this.#canvas.addEventListener('focus', () => {
      this.#announce('Canvas focused. Use arrow keys to move virtual cursor, Enter to interact.');
    });
  }

  #setupControls() {
    const muteBtn = document.getElementById('btn-mute') as HTMLButtonElement;
    const resetBtn = document.getElementById('btn-reset') as HTMLButtonElement;
    muteBtn.hidden = false; resetBtn.hidden = false;
    muteBtn.addEventListener('click', () => this.#toggleMute());
    resetBtn.addEventListener('click', () => this.#reset());

    // Multi-touch gesture support
    let lastPinchDist = 0;
    this.#canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        // Long press detection
        const longPressTimer = setTimeout(() => {
          this.#flower?.triggerCenterClick();
          this.#announce('Long press activated full bloom');
        }, 600);
        const clear = () => { clearTimeout(longPressTimer); this.#canvas.removeEventListener('pointerup', clear); };
        this.#canvas.addEventListener('pointerup', clear);
      }
    });
  }

  #showControls() {
    document.getElementById('controls')?.classList.add('visible');
  }

  #toggleMute() {
    this.#muted = !this.#muted;
    this.#audio?.setVolume(this.#muted ? 0 : 1);
    const btn = document.getElementById('btn-mute')!;
    btn.innerHTML = `<span aria-hidden="true">${this.#muted ? '🔇' : '🔊'}</span>`;
    this.#announce(this.#muted ? 'Audio muted' : 'Audio unmuted');
  }

  #reset() {
    this.#flower?.dispose();
    const flowerParams = generateFlowerParams();
    const flowerX = this.#width * 0.5;
    const flowerY = this.#height * 0.85;
    const stemHeight = Math.min(this.#height * 0.4, 300);
    const flowerRadius = Math.min(this.#width, this.#height) * 0.12;
    this.#flower = new DaisyFlower(flowerX, flowerY, stemHeight, flowerRadius, flowerParams);
    this.#entrance?.start();
    this.#announce('Experience reset with a new unique flower');
  }

  #setupAnalytics() {
    const events: any[] = [];
    const send = () => {
      if (events.length === 0) return;
      const payload = JSON.stringify({ session: crypto.randomUUID().slice(0, 8), events });
      try { navigator.sendBeacon?.('/analytics', new Blob([payload], { type: 'application/json' })); } catch (e) {}
    };
    window.addEventListener('beforeunload', send);
    (this as any)._analyticsEvents = events;
    (this as any)._analyticsSend = send;
  }

  #logEvent(name: string, data: object) {
    try {
      const events = (this as any)._analyticsEvents;
      if (events) events.push({ name, data, time: performance.now() });
    } catch (e) {}
  }

  #announce(message: string) {
    const announcer = document.getElementById('announcer');
    if (announcer) announcer.textContent = message;
  }

  #triggerChromaticAbberation() {
    (this as any)._caIntensity = 3;
    setTimeout(() => (this as any)._caIntensity = 0, 400);
  }

  #resize() {
    let dpr = this.#capabilities.pixelRatio;
    if (this.#capabilities.isMobile) dpr = Math.min(dpr, 1.5);
    this.#width = window.innerWidth;
    this.#height = window.innerHeight;
    this.#canvas.width = this.#width * dpr;
    this.#canvas.height = this.#height * dpr;
    this.#canvas.style.width = `${this.#width}px`;
    this.#canvas.style.height = `${this.#height}px`;
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.#background?.resize(this.#width, this.#height);
    this.#wind?.resize(this.#width, this.#height);
    this.#particles?.resize(this.#width, this.#height);
    this.#pollenTrail?.resize(this.#width, this.#height);
    this.#post?.resize(this.#width, this.#height);
    this.#weather?.resize(this.#width, this.#height);
    this.#events?.resize(this.#width, this.#height);
    this.#entities?.resize(this.#width, this.#height);
    if (this.#flower) {
      const flowerX = this.#width * 0.5;
      const flowerY = this.#height * 0.85;
      this.#flower.resize(flowerX, flowerY);
    }
    this.#bees?.resize(this.#width, this.#height);
    this.#eventBus.emit('resize', { width: this.#width, height: this.#height });
  }

  #animate(now: number) {
    if (!this.#isRunning || this.#isPaused) return;
    const elapsed = now - this.#lastFrameTime;
    if (elapsed < this.#frameInterval) {
      this.#rafId = requestAnimationFrame(this.#animate.bind(this));
      return;
    }
    this.#lastFrameTime = now - (elapsed % this.#frameInterval);
    const { dt } = this.#timeManager.tick(now);
    const cappedDt = Utils.clamp(dt, 0, 50);
    if (!this.#reducedMotion) {
      this.#update(cappedDt);
    } else {
      if (this.#timeManager.frameCount % 2 === 0) this.#update(cappedDt);
    }
    this.#drawFrame(cappedDt);
    this.#rafId = requestAnimationFrame(this.#animate.bind(this));
  }

  #update(deltaTime: number) {
    this.#entrance!.update();
    this.#stateManager!.update();
    this.#season!.update(deltaTime);
    this.#events!.update(deltaTime);
    this.#weather!.update(deltaTime, this.#wind!.getWindAt(this.#width / 2, this.#height / 2).x);
    const currentWeather = this.#weather!.current;
    if (currentWeather !== this.#lastWeather) {
      this.#lastWeather = currentWeather;
      this.#audio!.setWeather(currentWeather);
    }

    const wind = this.#wind!.getWindAt(
      this.#flower?.getFlowerHeadPosition().x ?? this.#width / 2,
      this.#flower?.getFlowerHeadPosition().y ?? this.#height / 2
    );
    this.#wind!.update(deltaTime, this.#input!.x, this.#input!.y);
    this.#background!.update(deltaTime, this.#input!.x, this.#input!.y, this.#wind!.getStrength());
    this.#particles!.update(deltaTime, wind);
    this.#pollenTrail!.update(deltaTime);

    if (this.#flower) {
      this.#flower.update(deltaTime, wind);
      this.#flower.syncWithAudio(this.#audio!.intensity);
      const pos = this.#entrance!.isComplete ? this.#flower.getFlowerHeadPosition() : null;
      if (pos && this.#bees) {
        this.#bees.updateFlowerPosition(pos.x, pos.y);
        this.#bees.update(deltaTime);
      }
      if (pos && this.#entities) {
        this.#entities.updateFlowerPosition(pos.x, pos.y);
        this.#entities.update(deltaTime, this.#isNight);
      }
    }
  }

  #drawFrame(_deltaTime: number) {
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, this.#width, this.#height);
    this.#background!.draw(this.#flower?.getFlowerHeadPosition().x, this.#flower?.getFlowerHeadPosition().y);
    this.#particles!.draw();
    this.#flower?.draw(ctx);
    this.#weather!.draw();
    this.#entities?.draw(this.#isNight);
    this.#bees?.draw();
    this.#pollenTrail!.draw();

    if (!this.#capabilities.isLowEnd) {
      const ca = (this as any)._caIntensity || 0;
      if (ca > 0) this.#post!.applyChromaticAberration(ctx, this.#width, this.#height, ca);
      this.#postFrameSkip++;
      // Bloom expensive: every 2nd frame. Grain: every 3rd frame. Vignette: every frame (cheap).
      if (this.#postFrameSkip % 2 === 0) this.#post!.applyBloom(this.#canvas, ctx, 0.3);
      this.#post!.applyVignette(ctx, this.#width, this.#height, 0.3);
      if (this.#postFrameSkip % 3 === 0) this.#post!.applyFilmGrain(ctx, this.#width, this.#height, 0.03);
    }

    this.#events!.draw();
  }

  dispose() {
    this.#isRunning = false;
    cancelAnimationFrame(this.#rafId);
    this.#abortCtrl.abort();
    this.#audio?.dispose();
    this.#particles?.dispose();
    this.#pollenTrail?.dispose();
    this.#input?.dispose();
    this.#weather?.dispose();
    this.#eventBus.dispose();
  }
}

const app = new DaisyExperience();
app.init();
(window as any).daisyApp = app;
