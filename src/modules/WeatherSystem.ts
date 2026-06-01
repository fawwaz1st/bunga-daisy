import { Utils } from '../config.js';
import { ObjectPool } from '../utils/ObjectPool.js';

interface Raindrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  alpha: number;
}

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
}

interface WetGroundRipple {
  x: number;
  y: number;
  width: number;
  speed: number;
  alpha: number;
  life: number;
}

export type WeatherType = 'clear' | 'rain' | 'thunder' | 'snow' | 'fog';

const TRANSITION_DURATION = 3000; // 3 seconds fade in/out
const IDLE_MIN = 30000; // 30 seconds
const IDLE_MAX = 120000; // 2 minutes
const WEATHER_MIN = 20000; // 20 seconds
const WEATHER_MAX = 60000; // 1 minute

export class WeatherSystem {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;

  // Weather state & auto-progression
  #currentWeather: WeatherType = 'clear';
  #targetWeather: WeatherType = 'clear';
  #weatherPhase: 'idle' | 'transition_in' | 'active' | 'transition_out' = 'idle';
  #transitionAlpha = 0; // 0..1, visual intensity of current target weather
  #weatherTimer = 0;
  #nextChangeTime = Utils.randomRange(IDLE_MIN, IDLE_MAX);
  #weatherDuration = 0;
  #manualOverride = false;

  // Particles
  #rainPool: ObjectPool<Raindrop>;
  #snowPool: ObjectPool<Snowflake>;
  #wetRipples: WetGroundRipple[] = [];

  // Thunder
  #thunderTimer = 0;
  #nextThunder = 0;
  #flashAlpha = 0;

  // Rainbow
  #rainbowAlpha = 0;
  #rainbowProgress = 0;

  // Time
  #time = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.#ctx = ctx;
    this.#width = width;
    this.#height = height;

    this.#rainPool = new ObjectPool(
      () => ({ x: 0, y: 0, speed: 0, length: 0, alpha: 0 }),
      (r) => {
        r.x = 0;
        r.y = -20;
        r.speed = 0;
        r.length = 0;
        r.alpha = 0;
      },
      300
    );

    this.#snowPool = new ObjectPool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, size: 0, rotation: 0, rotSpeed: 0, alpha: 0 }),
      (s) => {
        s.x = 0;
        s.y = -10;
        s.vx = 0;
        s.vy = 0;
        s.size = 0;
        s.rotation = 0;
        s.rotSpeed = 0;
        s.alpha = 0;
      },
      200
    );

    this.#nextThunder = Utils.randomRange(3000, 8000);
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  get current() {
    return this.#currentWeather;
  }

  get isTransitioning() {
    return this.#weatherPhase === 'transition_in' || this.#weatherPhase === 'transition_out';
  }

  get visualIntensity() {
    return this.#transitionAlpha;
  }

  /**
   * Manually set weather. This overrides auto-progression until the weather
   * finishes its natural cycle.
   */
  setWeather(type: WeatherType) {
    if (type === 'clear') {
      this.#weatherPhase = 'transition_out';
      this.#manualOverride = false;
      return;
    }
    if (this.#targetWeather === type && this.#weatherPhase !== 'idle') return;

    this.#targetWeather = type;
    this.#currentWeather = type;
    this.#weatherPhase = 'transition_in';
    this.#transitionAlpha = 0;
    this.#weatherTimer = 0;
    this.#weatherDuration = Utils.randomRange(WEATHER_MIN, WEATHER_MAX);
    this.#manualOverride = true;
    this.#rainPool.clearActive();
    this.#snowPool.clearActive();
    this.#rainbowAlpha = 0;
  }

  triggerRainbow() {
    this.#rainbowProgress = 0;
    this.#rainbowAlpha = 1;
  }

  update(deltaTime: number, windX: number) {
    this.#time += deltaTime * 0.001;
    const dt = deltaTime;

    // Auto-progression state machine
    this.#updateAutoProgression(dt);

    // Transition alpha smoothing
    const transitionSpeed = dt / TRANSITION_DURATION;
    if (this.#weatherPhase === 'transition_in') {
      this.#transitionAlpha = Math.min(1, this.#transitionAlpha + transitionSpeed);
      if (this.#transitionAlpha >= 1) {
        this.#transitionAlpha = 1;
        this.#weatherPhase = 'active';
        this.#weatherTimer = 0;
      }
    } else if (this.#weatherPhase === 'active') {
      this.#transitionAlpha = Utils.lerp(this.#transitionAlpha, 1, 0.05);
      this.#weatherTimer += dt;
      if (this.#weatherTimer >= this.#weatherDuration) {
        this.#weatherPhase = 'transition_out';
      }
    } else if (this.#weatherPhase === 'transition_out') {
      this.#transitionAlpha = Math.max(0, this.#transitionAlpha - transitionSpeed);
      if (this.#transitionAlpha <= 0) {
        this.#transitionAlpha = 0;
        this.#currentWeather = 'clear';
        this.#targetWeather = 'clear';
        this.#weatherPhase = 'idle';
        this.#weatherTimer = 0;
        this.#nextChangeTime = Utils.randomRange(IDLE_MIN, IDLE_MAX);
        this.#manualOverride = false;
        this.#rainPool.clearActive();
        this.#snowPool.clearActive();
        this.#wetRipples = [];
      }
    } else {
      // idle
      this.#weatherTimer += dt;
      if (!this.#manualOverride && this.#weatherTimer >= this.#nextChangeTime) {
        this.#pickRandomWeather();
      }
    }

    const activeType = this.#currentWeather !== 'clear' ? this.#currentWeather : this.#targetWeather;
    const intensity = this.#transitionAlpha;

    if ((activeType === 'rain' || activeType === 'thunder') && intensity > 0.1) {
      this.#updateRain(deltaTime, windX, intensity, activeType === 'thunder');
      this.#updateWetGround(deltaTime, intensity);
    }

    if (activeType === 'snow' && intensity > 0.1) {
      this.#updateSnow(deltaTime, windX, intensity);
    }

    if (activeType === 'thunder' && intensity > 0.1) {
      this.#updateThunder(deltaTime);
    }

    if (this.#rainbowAlpha > 0) {
      this.#rainbowProgress += deltaTime * 0.0005;
      if (this.#rainbowProgress > 1) this.#rainbowAlpha *= 0.995;
    }
  }

  #pickRandomWeather() {
    const options: WeatherType[] = ['rain', 'thunder', 'snow', 'fog'];
    const prev = this.#currentWeather;
    let next = options[Math.floor(Math.random() * options.length)];
    if (next === prev && options.length > 1) {
      next = options[(options.indexOf(next) + 1) % options.length];
    }
    this.#targetWeather = next;
    this.#currentWeather = next;
    this.#weatherPhase = 'transition_in';
    this.#transitionAlpha = 0;
    this.#weatherTimer = 0;
    this.#weatherDuration = Utils.randomRange(WEATHER_MIN, WEATHER_MAX);
    this.#rainPool.clearActive();
    this.#snowPool.clearActive();
  }

  #updateAutoProgression(_dt: number) {
    // Main logic is in update() above; this method is kept for clarity
  }

  #updateRain(deltaTime: number, windX: number, intensity: number, isThunder: boolean) {
    const targetCount = isThunder ? 200 : 120;
    const count = Math.floor(targetCount * intensity);
    while (this.#rainPool.activeCount() < count) {
      const r = this.#rainPool.acquire();
      r.x = Math.random() * this.#width;
      r.y = -Math.random() * 120;
      r.speed = Utils.randomRange(10, 20);
      r.length = Utils.randomRange(10, 28);
      r.alpha = Utils.randomRange(0.25, 0.6);
    }
    const active = this.#rainPool.getActive() as Raindrop[];
    for (let i = active.length - 1; i >= 0; i--) {
      const r = active[i];
      r.y += r.speed * (deltaTime * 0.06);
      r.x += windX * 0.6;
      if (r.y > this.#height + 20) {
        if (Math.random() < 0.02) {
          this.#spawnWetRipple(r.x, this.#height - Utils.randomRange(0, this.#height * 0.15));
        }
        this.#rainPool.release(r);
      }
    }
  }

  #updateSnow(deltaTime: number, windX: number, intensity: number) {
    const targetCount = Math.floor(120 * intensity);
    while (this.#snowPool.activeCount() < targetCount) {
      const s = this.#snowPool.acquire();
      s.x = Math.random() * this.#width;
      s.y = -Math.random() * 80;
      s.vx = Utils.randomRange(-0.8, 0.8);
      s.vy = Utils.randomRange(0.4, 2.2);
      s.size = Utils.randomRange(2, 5);
      s.rotation = Math.random() * Math.PI * 2;
      s.rotSpeed = Utils.randomRange(-0.03, 0.03);
      s.alpha = Utils.randomRange(0.5, 0.95);
    }
    const active = this.#snowPool.getActive() as Snowflake[];
    for (let i = active.length - 1; i >= 0; i--) {
      const s = active[i];
      s.y += s.vy * (deltaTime * 0.06);
      s.x += s.vx + windX * 0.3;
      s.rotation += s.rotSpeed * deltaTime;
      if (s.y > this.#height + 10) {
        this.#snowPool.release(s);
      }
    }
  }

  #updateThunder(deltaTime: number) {
    this.#thunderTimer += deltaTime;
    if (this.#thunderTimer >= this.#nextThunder) {
      this.#flashAlpha = 1;
      this.#thunderTimer = 0;
      this.#nextThunder = Utils.randomRange(1500, 5000);
    }
    this.#flashAlpha *= 0.9;
  }

  #spawnWetRipple(x: number, y: number) {
    this.#wetRipples.push({
      x,
      y,
      width: Utils.randomRange(10, 30),
      speed: Utils.randomRange(0.3, 0.8),
      alpha: Utils.randomRange(0.15, 0.35),
      life: 1,
    });
  }

  #updateWetGround(deltaTime: number, _intensity: number) {
    for (let i = this.#wetRipples.length - 1; i >= 0; i--) {
      const r = this.#wetRipples[i];
      r.life -= deltaTime * 0.001 * r.speed;
      if (r.life <= 0) {
        this.#wetRipples.splice(i, 1);
      }
    }
  }

  draw() {
    const ctx = this.#ctx;
    const activeType = this.#currentWeather !== 'clear' ? this.#currentWeather : this.#targetWeather;
    const t = this.#transitionAlpha;

    if (t <= 0.001) {
      if (this.#rainbowAlpha > 0.01) this.#drawRainbow(ctx);
      return;
    }

    switch (activeType) {
      case 'rain':
        this.#drawSkyDarken(ctx, t, 0.18, [100, 110, 125]);
        this.#drawGroundWet(ctx, t);
        this.#drawRainParticles(ctx);
        break;
      case 'thunder':
        this.#drawSkyDarken(ctx, t, 0.45, [60, 65, 75]);
        this.#drawGroundWet(ctx, t);
        this.#drawRainParticles(ctx);
        this.#drawThunderFlash(ctx);
        break;
      case 'snow':
        this.#drawSkyTint(ctx, t, [210, 220, 230], 0.25);
        this.#drawGroundSnow(ctx, t);
        this.#drawSnowParticles(ctx);
        break;
      case 'fog':
        this.#drawFog(ctx, t);
        break;
    }

    if (this.#rainbowAlpha > 0.01) this.#drawRainbow(ctx);
  }

  // --- Visual Overlays ---

  #drawSkyDarken(ctx: CanvasRenderingContext2D, intensity: number, maxDarken: number, tintRgb: number[]) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.#height * 0.75);
    const a = intensity * maxDarken;
    const [r, g, b] = tintRgb;
    grad.addColorStop(0, `rgba(${r},${g},${b},${a * 0.6})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${a * 0.9})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.#width, this.#height);
  }

  #drawSkyTint(ctx: CanvasRenderingContext2D, intensity: number, tintRgb: number[], maxTint: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.#height * 0.8);
    const a = intensity * maxTint;
    const [r, g, b] = tintRgb;
    grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    grad.addColorStop(0.6, `rgba(${r},${g},${b},${a * 0.6})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.#width, this.#height);
  }

  #drawGroundWet(ctx: CanvasRenderingContext2D, intensity: number) {
    const baseY = this.#height * 0.72;
    const h = this.#height - baseY;
    const grad = ctx.createLinearGradient(0, baseY, 0, this.#height);
    const a = intensity * 0.35;
    grad.addColorStop(0, 'rgba(80,90,100,0)');
    grad.addColorStop(0.4, `rgba(70,80,95,${a * 0.5})`);
    grad.addColorStop(1, `rgba(60,70,85,${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, baseY, this.#width, h);

    ctx.save();
    ctx.globalAlpha = intensity * 0.15;
    for (const r of this.#wetRipples) {
      const rx = r.x;
      const ry = r.y;
      const rw = r.width * (2 - r.life);
      ctx.strokeStyle = `rgba(160,180,200,${r.alpha * r.life})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rw * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  #drawGroundSnow(ctx: CanvasRenderingContext2D, intensity: number) {
    const baseY = this.#height * 0.78;
    const h = this.#height - baseY;
    const grad = ctx.createLinearGradient(0, baseY, 0, this.#height);
    const a = intensity * 0.55;
    grad.addColorStop(0, 'rgba(240,245,250,0)');
    grad.addColorStop(0.5, `rgba(235,240,248,${a * 0.5})`);
    grad.addColorStop(1, `rgba(230,235,245,${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, baseY, this.#width, h);

    ctx.save();
    ctx.globalAlpha = intensity * 0.25;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 137.5) % this.#width);
      const y = baseY + Math.sin(x * 0.01) * 8 + 10;
      const w = 20 + Math.sin(i * 2.7) * 10;
      ctx.beginPath();
      ctx.ellipse(x, y, w, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  #drawFog(ctx: CanvasRenderingContext2D, intensity: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.#height);
    const a = intensity * 0.65;
    grad.addColorStop(0, `rgba(210,215,225,${a * 0.1})`);
    grad.addColorStop(0.35, `rgba(205,210,222,${a * 0.25})`);
    grad.addColorStop(0.55, `rgba(200,205,218,${a * 0.55})`);
    grad.addColorStop(0.75, `rgba(195,200,215,${a * 0.8})`);
    grad.addColorStop(1, `rgba(190,195,210,${a * 0.95})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.#width, this.#height);

    const bandGrad = ctx.createLinearGradient(0, this.#height * 0.4, 0, this.#height * 0.75);
    bandGrad.addColorStop(0, 'rgba(200,205,220,0)');
    bandGrad.addColorStop(1, `rgba(185,190,205,${a * 0.5})`);
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, this.#height * 0.4, this.#width, this.#height * 0.35);
  }

  // --- Particles ---

  #drawRainParticles(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(185, 195, 215, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const r of this.#rainPool.getActive()) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + 0.5, r.y + r.length);
    }
    ctx.stroke();
  }

  #drawSnowParticles(ctx: CanvasRenderingContext2D) {
    for (const s of this.#snowPool.getActive()) {
      const c = Math.cos(s.rotation);
      const sn = Math.sin(s.rotation);
      ctx.fillStyle = `rgba(255, 255, 250, ${s.alpha})`;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = s.size * (1 + Math.cos(a * 3) * 0.15);
        const lx = Math.cos(a) * r;
        const ly = Math.sin(a) * r;
        // manual 2D rotation + translation
        ctx.lineTo(s.x + lx * c - ly * sn, s.y + lx * sn + ly * c);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  #drawThunderFlash(ctx: CanvasRenderingContext2D) {
    if (this.#flashAlpha > 0.005) {
      ctx.fillStyle = `rgba(255, 255, 245, ${this.#flashAlpha * 0.4})`;
      ctx.fillRect(0, 0, this.#width, this.#height);
    }
  }

  #drawRainbow(ctx: CanvasRenderingContext2D) {
    const cx = this.#width * 0.5;
    const cy = this.#height * 0.85;
    const radius = Math.min(this.#width, this.#height) * 0.45;
    const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
    ctx.save();
    for (let i = 0; i < colors.length; i++) {
      const r = radius - i * 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 5;
      ctx.globalAlpha = this.#rainbowAlpha * 0.25;
      ctx.stroke();
    }
    ctx.restore();
  }

  dispose() {
    this.#rainPool.dispose();
    this.#snowPool.dispose();
    this.#wetRipples = [];
  }
}
