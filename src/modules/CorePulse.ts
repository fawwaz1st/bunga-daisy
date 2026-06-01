/**
 * CorePulse - Procedural center with multiple patterns
 */
import { PHYSICS, TIMING, Utils } from '../config.js';
import type { FlowerParams } from '../utils/FlowerParams.js';

export class CorePulse {
  #x = 0;
  #y = 0;
  #radius = 0;
  #baseRadius = 0;
  #pulsePhase = 0;
  #pulseIntensity: number = PHYSICS.centerPulseAmount;
  #breathingDepth = 1;
  #glowIntensity = 0;
  #targetGlow = 0;
  #magnetOffset: { x: number; y: number } = { x: 0, y: 0 };
  #visible = false;
  #fillProgress = 0;
  #params: FlowerParams;

  #shimmerActive = false;
  #shimmerProgress = 0;
  #shimmerParticles: { angle: number; distance: number; targetDistance: number; alpha: number }[] = [];

  #orbitActive = false;
  #orbitParticles: { angle: number; speed: number; distance: number; size: number; alpha: number }[] = [];

  #textureSeeds: { angle: number; distance: number; size: number; brightness: number }[] = [];

  constructor(x: number, y: number, radius: number, params: FlowerParams) {
    this.#x = x; this.#y = y;
    this.#radius = radius;
    this.#baseRadius = radius;
    this.#params = params;
    
    const count = params.centerPattern === 'fibonacci' ? 34 : (params.centerPattern === 'spiral' ? 21 : 15);
    for (let i = 0; i < count; i++) {
      let angle: number, dist: number;
      if (params.centerPattern === 'fibonacci') {
        const golden = 2.39996; // golden angle
        angle = i * golden;
        dist = Math.sqrt(i / count);
      } else if (params.centerPattern === 'spiral') {
        angle = i * 0.6;
        dist = (i / count) * 0.95;
      } else if (params.centerPattern === 'rings') {
        const ring = Math.floor((i / count) * 3);
        angle = (i % 7) * (Math.PI * 2 / 7) + ring * 0.3;
        dist = 0.25 + ring * 0.3;
      } else {
        angle = Utils.randomRange(0, Math.PI * 2);
        dist = Utils.randomRange(0.15, 0.92);
      }
      this.#textureSeeds.push({ angle, distance: dist, size: Utils.randomRange(1, 3.5), brightness: Utils.randomRange(0.6, 1.3) });
    }
  }

  updatePosition(x: number, y: number) { this.#x = x; this.#y = y; }
  startFill() { this.#visible = true; this.#fillProgress = 0; }

  containsPoint(px: number, py: number) {
    if (!this.#visible || this.#fillProgress < 0.5) return false;
    const dx = px - (this.#x + this.#magnetOffset.x);
    const dy = py - (this.#y + this.#magnetOffset.y);
    return Math.hypot(dx, dy) < this.#radius * this.#fillProgress;
  }

  setHovered(hovered: boolean, cursorX: number, cursorY: number) {
    if (hovered) {
      this.#targetGlow = 0.45;
      this.#breathingDepth = 1.6;
      this.#startOrbit();
      this.#magnetOffset.x = (cursorX - this.#x) * 0.025;
      this.#magnetOffset.y = (cursorY - this.#y) * 0.025;
    } else {
      this.#targetGlow = 0;
      this.#breathingDepth = 1;
      this.#stopOrbit();
      this.#magnetOffset = { x: 0, y: 0 };
    }
  }

  triggerClick() {
    this.#triggerShimmer();
    this.#pulseIntensity = PHYSICS.centerPulseAmount * 2.5;
    setTimeout(() => { this.#pulseIntensity = PHYSICS.centerPulseAmount; }, 600);
  }

  #triggerShimmer() {
    this.#shimmerActive = true;
    this.#shimmerProgress = 0;
    this.#shimmerParticles = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      this.#shimmerParticles.push({ angle, distance: this.#radius * 0.5, targetDistance: this.#radius * 1.8, alpha: 1 });
    }
  }

  #startOrbit() {
    if (this.#orbitActive) return;
    this.#orbitActive = true;
    this.#orbitParticles = [];
    for (let i = 0; i < 8; i++) {
      this.#orbitParticles.push({ angle: (i / 8) * Math.PI * 2, speed: Utils.randomRange(0.4, 1.2), distance: this.#radius * 1.3, size: Utils.randomRange(1, 2.5), alpha: 0 });
    }
  }

  #stopOrbit() { this.#orbitActive = false; }

  syncWithAudio(intensity: number) {
    this.#pulseIntensity = PHYSICS.centerPulseAmount * (1 + intensity * 0.6);
  }

  update(deltaTime: number, musicIntensity = 0) {
    if (!this.#visible) return;
    const dt = deltaTime * 0.001;

    if (this.#fillProgress < 1) {
      this.#fillProgress += dt * 0.7;
      this.#fillProgress = Math.min(1, this.#fillProgress);
    }

    this.#pulsePhase += dt * PHYSICS.centerPulseSpeed;
    const breathe = Math.sin(this.#pulsePhase) * this.#pulseIntensity * this.#breathingDepth;
    this.#radius = this.#baseRadius * (1 + breathe) * this.#fillProgress;
    if (musicIntensity > 0) this.#radius *= 1 + musicIntensity * 0.03;

    this.#glowIntensity = Utils.lerp(this.#glowIntensity, this.#targetGlow, 0.1);
    this.#magnetOffset.x *= 0.95; this.#magnetOffset.y *= 0.95;

    if (this.#shimmerActive) {
      this.#shimmerProgress += deltaTime / TIMING.shimmerDuration;
      for (const p of this.#shimmerParticles) {
        p.distance = Utils.lerp(p.distance, p.targetDistance, 0.1);
        p.alpha = 1 - this.#shimmerProgress;
      }
      if (this.#shimmerProgress >= 1) { this.#shimmerActive = false; this.#shimmerParticles = []; }
    }

    if (this.#orbitActive) {
      for (const p of this.#orbitParticles) {
        p.angle += deltaTime * 0.002 * p.speed;
        p.alpha = Utils.lerp(p.alpha, 0.6, 0.05);
      }
    } else {
      for (const p of this.#orbitParticles) { p.alpha *= 0.9; }
      if (this.#orbitParticles.length && this.#orbitParticles[0].alpha < 0.01) this.#orbitParticles = [];
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.#visible || this.#fillProgress <= 0) return;
    const cx = this.#x + this.#magnetOffset.x;
    const cy = this.#y + this.#magnetOffset.y;

    ctx.save();

    if (this.#glowIntensity > 0.01) {
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.#radius * 2.2);
      glow.addColorStop(0, `rgba(230, 200, 74, ${this.#glowIntensity * 0.35})`);
      glow.addColorStop(0.5, `rgba(230, 200, 74, ${this.#glowIntensity * 0.12})`);
      glow.addColorStop(1, 'rgba(230, 200, 74, 0)');
      ctx.beginPath(); ctx.arc(cx, cy, this.#radius * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();
    }

    const ch = this.#params.centerHue;
    const grad = ctx.createRadialGradient(cx - this.#radius * 0.2, cy - this.#radius * 0.2, 0, cx, cy, this.#radius);
    grad.addColorStop(0, `hsl(${ch}, 75%, 58%)`);
    grad.addColorStop(0.6, `hsl(${ch}, 65%, 42%)`);
    grad.addColorStop(1, `hsl(${ch}, 55%, 28%)`);
    ctx.beginPath(); ctx.arc(cx, cy, this.#radius, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();

    for (const seed of this.#textureSeeds) {
      if (seed.distance > this.#fillProgress) continue;
      const x = cx + Math.cos(seed.angle) * seed.distance * this.#radius;
      const y = cy + Math.sin(seed.angle) * seed.distance * this.#radius;
      ctx.beginPath(); ctx.arc(x, y, seed.size * this.#fillProgress, 0, Math.PI * 2);
      const bright = seed.brightness > 1 ? `hsl(${ch + 10}, 70%, 65%)` : `hsl(${ch - 10}, 50%, 22%)`;
      ctx.fillStyle = bright;
      ctx.globalAlpha = 0.35; ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of this.#shimmerParticles) {
      if (p.alpha <= 0) continue;
      const x = cx + Math.cos(p.angle) * p.distance;
      const y = cy + Math.sin(p.angle) * p.distance;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 250, 200, ${p.alpha})`; ctx.fill();
    }

    for (const p of this.#orbitParticles) {
      if (p.alpha <= 0.01) continue;
      const x = cx + Math.cos(p.angle) * p.distance;
      const y = cy + Math.sin(p.angle) * p.distance;
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 200, 100, ${p.alpha})`; ctx.fill();
    }

    ctx.restore();
  }
}
