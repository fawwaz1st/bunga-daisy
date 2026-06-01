/**
 * ParticleSystem with ObjectPool - no GC pressure
 */
import { COLORS, PHYSICS, Utils } from '../config.js';
import type { Vec2, DeviceCapabilities } from '../config.js';
import { ObjectPool } from '../utils/ObjectPool.js';

interface ParticleData {
  type: 'dust' | 'pollen' | 'firefly';
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  decay: number;
  size: number;
  color: string;
  alpha: number;
  phase: number;
  currentAlpha?: number;
}

export class ParticleSystem {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;
  #capabilities: DeviceCapabilities;
  #nightMode = false;
  #cursorX = 0;
  #cursorY = 0;

  #dustPool: ObjectPool<ParticleData>;
  #pollenPool: ObjectPool<ParticleData>;
  #fireflyPool: ObjectPool<ParticleData>;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number, capabilities: DeviceCapabilities) {
    this.#ctx = ctx;
    this.#width = width;
    this.#height = height;
    this.#capabilities = capabilities;

    const reset = (p: ParticleData) => {
      p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.life = 1; p.alpha = 0.5; p.phase = Math.random() * Math.PI * 2;
    };
    this.#dustPool = new ObjectPool(() => ({ type: 'dust', x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1, decay: 0.01, size: 2, color: COLORS.dustMote, alpha: 0.5, phase: 0 } as ParticleData), reset, capabilities.maxParticles);
    this.#pollenPool = new ObjectPool(() => ({ type: 'pollen', x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1, decay: 0.02, size: 3, color: COLORS.pollenGold, alpha: 0.6, phase: 0 } as ParticleData), reset, PHYSICS.maxPollenParticles);
    this.#fireflyPool = new ObjectPool(() => ({ type: 'firefly', x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 3, decay: -0.005, size: 4, color: COLORS.fireflyGlow, alpha: 0, phase: 0 } as ParticleData), reset, capabilities.isLowEnd ? 4 : PHYSICS.maxFireflies);
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  spawnDust(count = 1) {
    for (let i = 0; i < count && this.#dustPool.activeCount() < this.#capabilities.maxParticles; i++) {
      const p = this.#dustPool.acquire();
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: p.x = Math.random() * this.#width; p.y = -10; break;
        case 1: p.x = this.#width + 10; p.y = Math.random() * this.#height; break;
        case 2: p.x = Math.random() * this.#width; p.y = this.#height + 10; break;
        default: p.x = -10; p.y = Math.random() * this.#height;
      }
      p.vx = Utils.randomRange(-0.5, 0.5);
      p.vy = Utils.randomRange(-0.3, -0.1);
      p.size = Utils.randomRange(1, 3);
      p.alpha = Utils.randomRange(0.1, 0.3);
      p.decay = Utils.randomRange(0.002, 0.005);
      p.color = COLORS.dustMote;
    }
  }

  spawnPollen(x: number, y: number, velocity = 1) {
    const count = Math.min(3, Math.floor(velocity * 2));
    for (let i = 0; i < count && this.#pollenPool.activeCount() < PHYSICS.maxPollenParticles; i++) {
      const p = this.#pollenPool.acquire();
      p.x = x + Utils.randomRange(-5, 5);
      p.y = y + Utils.randomRange(-5, 5);
      p.vx = Utils.randomRange(-1, 1) * velocity;
      p.vy = Utils.randomRange(-1, 0.5) * velocity;
      p.size = Utils.randomRange(2, 4);
      p.alpha = Utils.randomRange(0.4, 0.7);
      p.decay = Utils.randomRange(0.02, 0.04);
      p.color = COLORS.pollenGold;
    }
  }

  spawnPollenBurst(x: number, y: number, count = 15) {
    for (let i = 0; i < count && this.#pollenPool.activeCount() < PHYSICS.maxPollenParticles * 2; i++) {
      const p = this.#pollenPool.acquire();
      const angle = (i / count) * Math.PI * 2 + Utils.randomRange(-0.2, 0.2);
      const speed = Utils.randomRange(1, 3);
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = Utils.randomRange(2, 5);
      p.alpha = Utils.randomRange(0.5, 0.8);
      p.decay = Utils.randomRange(0.015, 0.025);
      p.color = COLORS.pollenGold;
    }
  }

  spawnFireflies() {
    while (this.#fireflyPool.activeCount() < (this.#capabilities.isLowEnd ? 4 : PHYSICS.maxFireflies)) {
      const p = this.#fireflyPool.acquire();
      const edge = Math.random() > 0.5;
      p.x = edge ? Utils.randomRange(0, this.#width * 0.2) : Utils.randomRange(this.#width * 0.8, this.#width);
      p.y = Utils.randomRange(this.#height * 0.3, this.#height * 0.8);
      p.vx = Utils.randomRange(-0.2, 0.2);
      p.vy = Utils.randomRange(-0.1, 0.1);
      p.size = Utils.randomRange(3, 6);
      p.alpha = 0;
      p.decay = -0.005;
      p.color = COLORS.fireflyGlow;
    }
  }

  setNightMode(enabled: boolean) {
    this.#nightMode = enabled;
    if (enabled) this.spawnFireflies();
    else this.#fireflyPool.clearActive();
  }

  updateCursor(x: number, y: number) {
    this.#cursorX = x;
    this.#cursorY = y;
  }

  update(deltaTime: number, wind: Vec2) {
    // Dust
    if (Math.random() < 0.02 && this.#dustPool.activeCount() < this.#capabilities.maxParticles) {
      this.spawnDust();
    }
    for (const p of this.#dustPool.getActive()) {
      p.vx += wind.x * 0.01; p.vy += wind.y * 0.01;
      p.x += p.vx * deltaTime * 0.05; p.y += p.vy * deltaTime * 0.05;
      p.life -= p.decay * deltaTime * 0.01;
      p.vy -= 0.001 * deltaTime;
      p.x += Math.sin(performance.now() * 0.001 + p.phase) * 0.1;

      const dist = Utils.distance(p.x, p.y, this.#cursorX, this.#cursorY);
      if (dist < 100) p.alpha *= 0.95;
      if (p.x < -50 || p.x > this.#width + 50 || p.y < -50 || p.y > this.#height + 50 || p.life <= 0) {
        this.#dustPool.release(p);
      }
    }

    // Pollen
    for (const p of this.#pollenPool.getActive()) {
      p.vx *= PHYSICS.pollenDissipateSpeed; p.vy *= PHYSICS.pollenDissipateSpeed;
      p.x += p.vx; p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) this.#pollenPool.release(p);
    }

    // Fireflies
    if (this.#nightMode) {
      for (const p of this.#fireflyPool.getActive()) {
        p.vx += (Math.random() - 0.5) * 0.02; p.vy += (Math.random() - 0.5) * 0.02;
        p.vx *= 0.98; p.vy *= 0.98;
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay * deltaTime * 0.01;
        p.currentAlpha = Math.max(0, Math.min(0.8, p.alpha + Math.sin(performance.now() * 0.003 + p.phase) * 0.3));
        const dist = Utils.distance(p.x, p.y, this.#cursorX, this.#cursorY);
        if (dist < 150 && p.currentAlpha) p.currentAlpha *= 0.5;
        if (p.x < -20) p.x = this.#width + 20;
        if (p.x > this.#width + 20) p.x = -20;
        if (p.y < this.#height * 0.2) p.vy += 0.01;
        if (p.y > this.#height * 0.9) p.vy -= 0.01;
        if (p.life > 3 || p.life < -2) this.#fireflyPool.release(p);
      }
      if (this.#fireflyPool.activeCount() < (this.#capabilities.isLowEnd ? 4 : PHYSICS.maxFireflies)) {
        this.spawnFireflies();
      }
    }
  }

  draw() {
    const ctx = this.#ctx;

    // Dust
    for (const p of this.#dustPool.getActive()) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 192, 168, ${p.alpha * p.life})`;
      ctx.fill();
    }

    // Pollen batch draw with screen composite
    if (this.#pollenPool.activeCount() > 0) {
      ctx.globalCompositeOperation = 'screen';
      for (const p of this.#pollenPool.getActive()) {
        const a = p.alpha * p.life;
        ctx.fillStyle = `rgba(212, 184, 74, ${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // Fireflies
    if (this.#nightMode) {
      for (const p of this.#fireflyPool.getActive()) {
        const a = p.currentAlpha ?? p.alpha;
        if (a <= 0) continue;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, `rgba(255, 232, 152, ${a})`);
        grad.addColorStop(0.3, `rgba(255, 232, 152, ${a * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 232, 152, 0)');
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 220, ${a})`; ctx.fill();
      }
    }
  }

  dispose() {
    this.#dustPool.dispose();
    this.#pollenPool.dispose();
    this.#fireflyPool.dispose();
  }
}
