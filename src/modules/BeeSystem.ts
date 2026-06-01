/**
 * BeeSystem - TypeScript port with dispose
 */
import { Utils } from '../config.js';

interface Bee {
  x: number; y: number; targetX: number; targetY: number; velocityX: number; velocityY: number;
  wingPhase: number; bobPhase: number; size: number; rotation: number;
  state: 'idle' | 'approaching' | 'hovering' | 'leaving';
  hoverTime: number; hoverDuration: number; hoverOffset: { x: number; y: number };
  maxSpeed: number; acceleration: number; wanderAngle: number;
}

export class BeeSystem {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;
  #bees: Bee[] = [];
  #maxBees = 4;
  #flowerX = 0;
  #flowerY = 0;
  #visitInterval = 10000;
  #lastVisitTime = 0;
  #time = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.#ctx = ctx; this.#width = width; this.#height = height;
    this.#flowerX = width / 2; this.#flowerY = height / 2;
    this.#initBees();
  }

  #initBees() {
    this.#bees = [];
    for (let i = 0; i < this.#maxBees; i++) this.#bees.push(this.#createBee(i));
  }

  #createBee(index: number): Bee {
    const side = index % 4;
    let sx: number, sy: number;
    switch (side) {
      case 0: sx = -50; sy = this.#height * 0.3; break;
      case 1: sx = this.#width + 50; sy = this.#height * 0.4; break;
      case 2: sx = this.#width * 0.3; sy = -50; break;
      default: sx = this.#width * 0.7; sy = -50;
    }
    return {
      x: sx, y: sy, targetX: sx, targetY: sy, velocityX: 0, velocityY: 0,
      wingPhase: Utils.randomRange(0, Math.PI * 2), bobPhase: Utils.randomRange(0, Math.PI * 2),
      size: Utils.randomRange(6, 10), rotation: 0,
      state: 'idle', hoverTime: 0, hoverDuration: Utils.randomRange(3000, 6000),
      hoverOffset: { x: Utils.randomRange(-30, 30), y: Utils.randomRange(-20, 20) },
      maxSpeed: Utils.randomRange(0.2, 0.4), acceleration: Utils.randomRange(0.005, 0.01), wanderAngle: 0
    };
  }

  resize(width: number, height: number) { this.#width = width; this.#height = height; }
  updateFlowerPosition(x: number, y: number) { this.#flowerX = x; this.#flowerY = y; }

  update(deltaTime: number) {
    this.#time += deltaTime;
    if (this.#time - this.#lastVisitTime > this.#visitInterval) {
      this.#triggerVisit(); this.#lastVisitTime = this.#time;
    }
    this.#bees.forEach(bee => this.#updateBee(bee, deltaTime));
  }

  #triggerVisit() {
    const idle = this.#bees.filter(b => b.state === 'idle');
    if (idle.length > 0) {
      const bee = idle[Math.floor(Math.random() * idle.length)];
      bee.state = 'approaching';
      bee.hoverOffset = { x: Utils.randomRange(-25, 25), y: Utils.randomRange(-20, 15) };
      bee.hoverDuration = Utils.randomRange(4000, 7000);
    }
  }

  #updateBee(bee: Bee, deltaTime: number) {
    const dt = deltaTime * 0.001;
    bee.wingPhase += dt * 40; bee.bobPhase += dt * 3;
    switch (bee.state) {
      case 'idle': this.#updateIdle(bee, dt); break;
      case 'approaching': this.#updateApproaching(bee, dt); break;
      case 'hovering': this.#updateHovering(bee, dt, deltaTime); break;
      case 'leaving': this.#updateLeaving(bee, dt); break;
    }
    if (Math.abs(bee.velocityX) > 0.01 || Math.abs(bee.velocityY) > 0.01) {
      bee.rotation = Math.atan2(bee.velocityY, bee.velocityX);
    }
  }

  #updateIdle(bee: Bee, dt: number) {
    bee.wanderAngle += (Math.random() - 0.5) * 2 * dt;
    bee.velocityX = Utils.lerp(bee.velocityX, Math.cos(bee.wanderAngle) * 0.05, 0.02);
    bee.velocityY = Utils.lerp(bee.velocityY, Math.sin(bee.wanderAngle) * 0.05, 0.02);
    bee.x += bee.velocityX * dt * 60; bee.y += bee.velocityY * dt * 60;
  }

  #updateApproaching(bee: Bee, dt: number) {
    const tx = this.#flowerX + bee.hoverOffset.x;
    const ty = this.#flowerY + bee.hoverOffset.y - 40;
    const dx = tx - bee.x, dy = ty - bee.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 15) { bee.state = 'hovering'; bee.hoverTime = 0; return; }
    const waver = Math.sin(this.#time * 0.005 + bee.bobPhase) * 0.05;
    bee.velocityX = Utils.lerp(bee.velocityX, (dx / dist) * bee.maxSpeed + waver, bee.acceleration * dt * 60);
    bee.velocityY = Utils.lerp(bee.velocityY, (dy / dist) * bee.maxSpeed, bee.acceleration * dt * 60);
    bee.x += bee.velocityX * dt * 60; bee.y += bee.velocityY * dt * 60;
  }

  #updateHovering(bee: Bee, dt: number, deltaTime: number) {
    bee.hoverTime += deltaTime;
    const tx = this.#flowerX + bee.hoverOffset.x;
    const ty = this.#flowerY + bee.hoverOffset.y - 35;
    const ox = Math.cos(this.#time * 0.002 + bee.bobPhase) * 8;
    const oy = Math.sin(this.#time * 0.003 + bee.bobPhase * 1.3) * 5;
    bee.velocityX = Utils.lerp(bee.velocityX, (tx + ox - bee.x) * 0.05, 0.1);
    bee.velocityY = Utils.lerp(bee.velocityY, (ty + oy - bee.y) * 0.05, 0.1);
    bee.x += bee.velocityX * dt * 60; bee.y += bee.velocityY * dt * 60;
    if (bee.hoverTime > bee.hoverDuration) {
      bee.state = 'leaving';
      bee.targetX = bee.x + (Math.random() > 0.5 ? 1 : -1) * (this.#width + 100);
      bee.targetY = Utils.randomRange(-50, this.#height * 0.4);
    }
  }

  #updateLeaving(bee: Bee, dt: number) {
    const dx = bee.targetX - bee.x, dy = bee.targetY - bee.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 20 || bee.x < -60 || bee.x > this.#width + 60 || bee.y < -60) {
      bee.state = 'idle'; bee.x = bee.targetX; bee.y = bee.targetY;
      bee.hoverDuration = Utils.randomRange(3000, 6000); return;
    }
    bee.velocityX = Utils.lerp(bee.velocityX, (dx / dist) * bee.maxSpeed * 1.5, bee.acceleration * 2 * dt * 60);
    bee.velocityY = Utils.lerp(bee.velocityY, (dy / dist) * bee.maxSpeed * 1.2, bee.acceleration * 2 * dt * 60);
    bee.x += bee.velocityX * dt * 60; bee.y += bee.velocityY * dt * 60;
  }

  draw() { this.#bees.forEach(bee => this.#drawBee(bee)); }

  #drawBee(bee: Bee) {
    if (bee.state === 'idle' && (bee.x < -50 || bee.x > this.#width + 50 || bee.y < -50 || bee.y > this.#height + 50)) return;
    const ctx = this.#ctx;
    const bob = Math.sin(bee.bobPhase) * 2;
    ctx.save(); ctx.translate(bee.x, bee.y + bob); ctx.rotate(bee.rotation);
    const s = bee.size;
    const wa = Math.sin(bee.wingPhase) * 0.4;
    ctx.fillStyle = 'rgba(200,220,255,0.6)';
    ctx.save(); ctx.rotate(-0.3 + wa); ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.4, s * 0.6, s * 0.25, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(0.3 - wa); ctx.beginPath(); ctx.ellipse(-s * 0.1, s * 0.4, s * 0.6, s * 0.25, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0c040'; ctx.beginPath(); ctx.ellipse(s * 0.1, 0, s * 0.15, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-s * 0.2, 0, s * 0.1, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(s * 0.5, 0, s * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(s * 0.55, s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
