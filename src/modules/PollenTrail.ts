/**
 * PollenTrail - menggunakan ObjectPool untuk performa
 */
import { PHYSICS, Utils } from '../config.js';
import { ObjectPool } from '../utils/ObjectPool.js';

interface TrailParticle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  life: number;
  decay: number;
}

export class PollenTrail {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;
  #pool: ObjectPool<TrailParticle>;
  #cursorX = 0;
  #cursorY = 0;
  #lastX = 0;
  #lastY = 0;
  #velocity = 0;
  #spawnAcc = 0;
  #active = false;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.#ctx = ctx;
    this.#width = width;
    this.#height = height;
    this.#pool = new ObjectPool(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, size: 3, life: 1, decay: 0.03 }),
      (p) => { p.x = 0; p.y = 0; p.vx = 0; p.vy = 0; p.life = 1; p.decay = 0.03; },
      PHYSICS.maxPollenParticles
    );
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  activate() { this.#active = true; }
  deactivate() { this.#active = false; }

  updateCursor(x: number, y: number) {
    this.#lastX = this.#cursorX;
    this.#lastY = this.#cursorY;
    this.#cursorX = x;
    this.#cursorY = y;
    const dx = x - this.#lastX;
    const dy = y - this.#lastY;
    this.#velocity = Math.min(20, Math.hypot(dx, dy));
  }

  update(deltaTime: number) {
    if (this.#active && this.#velocity > 1) {
      this.#spawnAcc += this.#velocity * deltaTime * 0.01;
      while (this.#spawnAcc >= 1 && this.#pool.activeCount() < PHYSICS.maxPollenParticles) {
        const p = this.#pool.acquire();
        p.x = this.#cursorX + Utils.randomRange(-5, 5);
        p.y = this.#cursorY + Utils.randomRange(-5, 5);
        p.vx = Utils.randomRange(-0.5, 0.5) + (this.#cursorX - this.#lastX) * 0.1;
        p.vy = Utils.randomRange(-0.5, 0.2) + (this.#cursorY - this.#lastY) * 0.1;
        p.size = Utils.randomRange(2, 4);
        p.life = 1;
        p.decay = Utils.randomRange(0.02, 0.04);
        this.#spawnAcc -= 1;
      }
    }

    for (const p of this.#pool.getActive()) {
      p.vy += 0.01;
      p.vx *= PHYSICS.pollenDissipateSpeed;
      p.vy *= PHYSICS.pollenDissipateSpeed;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) this.#pool.release(p);
    }
  }

  draw() {
    const ctx = this.#ctx;
    ctx.globalCompositeOperation = 'screen';
    for (const p of this.#pool.getActive()) {
      const a = p.life * 0.8;
      ctx.fillStyle = `rgba(212, 184, 74, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 240, 180, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  dispose() {
    this.#pool.dispose();
  }
}
