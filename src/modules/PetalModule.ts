/**
 * Enhanced PetalModule with Procedural Generation support
 * Multi-layer petals, asymmetric shapes, varied curvature
 */
import { PHYSICS, Utils } from '../config.js';
import type { Vec2 } from '../config.js';
import type { FlowerParams } from '../utils/FlowerParams.js';
import { SeedRandom } from '../utils/SeedRandom.js';

export class Petal {
  index: number;
  totalPetals: number;
  layer: number;
  baseAngle: number;
  angle = 0;
  hueOffset: number;
  lengthVariation: number;
  widthVariation: number;
  phase: number;
  naturalFreq: number;
  length: number;
  width: number;
  curvature: number;
  tiltAngle = 0;
  tiltVelocity = 0;
  targetTilt = 0;
  tiltStiffness: number;
  tiltDamping = 0.12;
  spinAngle = 0;
  spinVelocity = 0;
  spinDamping = 0.92;
  bendAngle = 0;
  bendVelocity = 0;
  bendStiffness: number;
  scale = 1;
  scaleVelocity = 0;
  targetScale = 1;
  isHovered = false;
  glowIntensity = 0;
  hueShift = 0;
  vibrationPhase = 0;
  bloomProgress = 0;
  visible = false;
  rippleActive = false;
  rippleProgress = 0;
  rippleIntensity = 0;

  constructor(index: number, totalPetals: number, centerX: number, centerY: number, baseRadius: number, params: FlowerParams, layer = 0, rng?: SeedRandom) {
    this.index = index; this.totalPetals = totalPetals; this.layer = layer;
    const r = rng ?? new SeedRandom(params.seed + index + layer * 1000);
    
    // Asymmetric distribution
    const angleOffset = r.range(-params.asymmetry, params.asymmetry);
    this.baseAngle = (index / totalPetals) * Math.PI * 2 + angleOffset + (layer * Math.PI / totalPetals);
    this.angle = this.baseAngle;
    
    this.hueOffset = r.range(-params.hueRange, params.hueRange);
    this.lengthVariation = r.range(0.85, 1.15) * params.petalLengthVar;
    this.widthVariation = r.range(0.8, 1.2) * params.petalWidthVar;
    this.phase = r.range(0, Math.PI * 2);
    this.naturalFreq = r.range(2.2, 5.0);
    
    const layerScale = layer === 0 ? 1 : params.innerPetalRatio;
    this.length = baseRadius * 0.75 * this.lengthVariation * layerScale;
    this.width = baseRadius * 0.14 * this.widthVariation * layerScale;
    this.curvature = params.curvature * r.range(0.8, 1.2);
    
    this.tiltStiffness = 0.14 * r.range(0.7, 1.4);
    this.bendStiffness = r.range(0.06, 0.18);
  }

  getHue(params: FlowerParams) {
    return params.hueBase + this.hueOffset + this.hueShift;
  }

  startBloom(delay = 0) {
    setTimeout(() => { this.visible = true; }, delay);
  }

  containsPoint(px: number, py: number, centerX: number, centerY: number) {
    if (!this.visible || this.bloomProgress < 0.4) return false;
    const da = this.angle + this.spinAngle;
    const plen = this.length * this.scale * this.bloomProgress;
    const dx = px - centerX, dy = py - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > plen * 1.1 || dist < this.length * 0.05) return false;
    let diff = Math.abs(Math.atan2(dy, dx) - da);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    const wt = (this.width * (1 - dist / plen * 0.5)) / dist;
    return diff < wt * 1.2;
  }

  setHovered(hovered: boolean) {
    this.isHovered = hovered;
    if (hovered) {
      this.targetTilt = Utils.degToRad(Utils.randomRange(2, PHYSICS.petalTiltMax));
      this.hueShift = 3;
    } else {
      this.targetTilt = 0; this.hueShift = 0;
    }
  }

  triggerClick() {
    const dir = Math.random() > 0.5 ? 1 : -1;
    this.spinVelocity = Utils.degToRad(PHYSICS.petalSpinAngle) * dir;
    this.targetScale = 1.06;
    setTimeout(() => this.targetScale = 1, 250);
  }

  triggerRipple() {
    this.rippleActive = true;
    this.rippleProgress = 0;
    this.spinVelocity = Utils.degToRad(4) * (Math.random() > 0.5 ? 1 : -1);
  }

  triggerBloom() {
    this.targetScale = PHYSICS.centerBloomScale;
    setTimeout(() => this.targetScale = 1, 500);
  }

  update(deltaTime: number, wind: Vec2) {
    if (!this.visible) return;
    const dt = deltaTime * 0.001;
    const time = performance.now() * 0.001;

    if (this.bloomProgress < 1) {
      this.bloomProgress += dt * PHYSICS.petalBloomSpeed * (0.8 + this.layer * 0.3);
      this.bloomProgress = Math.min(1, this.bloomProgress);
      if (this.bloomProgress >= 0.85) {
        const t = (this.bloomProgress - 0.85) / 0.15;
        const elastic = Math.sin(t * Math.PI * 2.5) * Math.exp(-t * 3);
        this.scale = 1 + elastic * 0.08;
      }
    }

    const wf = wind.x * 0.08 + wind.y * 0.02;
    const targetBend = wf * (1 + Math.sin(time * this.naturalFreq + this.phase) * 0.3);
    const bs = (targetBend - this.bendAngle) * this.bendStiffness;
    const bd = -this.bendVelocity * this.tiltDamping;
    this.bendVelocity += (bs + bd) * dt * 60;
    this.bendAngle += this.bendVelocity * dt * 60;
    const ns = Math.sin(time * this.naturalFreq * 0.3 + this.phase) * 0.008;
    this.angle = this.baseAngle + this.bendAngle + ns;

    const ts = (this.targetTilt - this.tiltAngle) * this.tiltStiffness;
    const td = -this.tiltVelocity * this.tiltDamping;
    this.tiltVelocity += (ts + td) * dt * 60;
    this.tiltAngle += this.tiltVelocity * dt * 60;

    if (this.isHovered) {
      this.vibrationPhase += dt * 25;
      this.tiltAngle += Math.sin(this.vibrationPhase) * 0.005;
    }

    this.spinAngle += this.spinVelocity * dt * 60;
    this.spinVelocity *= Math.pow(this.spinDamping, dt * 60);
    this.spinVelocity += -this.spinAngle * 0.05 * dt * 60;

    const sDiff = this.targetScale - this.scale;
    this.scaleVelocity += sDiff * 0.15 * dt * 60;
    this.scaleVelocity *= 0.85;
    this.scale += this.scaleVelocity * dt * 60;

    const tg = this.isHovered ? 0.7 : 0;
    this.glowIntensity += (tg - this.glowIntensity) * 0.08;

    if (this.rippleActive) {
      this.rippleProgress += dt * 4;
      this.rippleIntensity = Math.sin(this.rippleProgress * Math.PI) * (1 - this.rippleProgress);
      if (this.rippleProgress >= 1) { this.rippleActive = false; this.rippleProgress = 0; this.rippleIntensity = 0; }
    }
  }

  draw(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, params: FlowerParams) {
    if (!this.visible || this.bloomProgress <= 0) return;
    const da = this.angle + this.spinAngle;
    const cl = this.length * this.scale * this.bloomProgress;
    const cw = this.width * this.scale * this.bloomProgress;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(da);
    ctx.rotate(this.tiltAngle);

    // Procedural petal shape with curvature
    ctx.beginPath(); ctx.moveTo(0, 0);
    const cp1x = cl * 0.25;
    const cp1y = -cw * (0.6 + this.curvature * 0.4);
    const cp2x = cl * (0.65 + this.curvature * 0.2);
    const cp2y = -cw * (0.4 + this.curvature * 0.3);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, cl, 0);
    const cp3x = cl * (0.65 + this.curvature * 0.2);
    const cp3y = cw * (0.4 + this.curvature * 0.3);
    const cp4x = cl * 0.25;
    const cp4y = cw * (0.6 + this.curvature * 0.4);
    ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, 0, 0);

    const hue = this.getHue(params);
    const sat = params.saturationBase;
    const lit = params.lightnessBase;
    const grad = ctx.createLinearGradient(0, 0, cl, 0);
    grad.addColorStop(0, `hsl(${hue}, ${sat + 8}%, ${lit - 4}%)`);
    grad.addColorStop(0.3, `hsl(${hue}, ${sat}%, ${lit}%)`);
    grad.addColorStop(0.7, `hsl(${hue}, ${sat}%, ${lit}%)`);
    grad.addColorStop(1, `hsl(${hue}, ${sat + 6}%, ${lit - 2}%)`);
    ctx.fillStyle = grad; ctx.fill();

    if (this.glowIntensity > 0.01) {
      ctx.strokeStyle = `rgba(255, 250, 220, ${this.glowIntensity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Vein
    ctx.beginPath(); ctx.moveTo(cl * 0.1, 0); ctx.lineTo(cl * 0.88, 0);
    ctx.strokeStyle = `rgba(200,190,160,0.18)`; ctx.lineWidth = 0.5; ctx.stroke();

    // Secondary veins for detail
    if (this.layer === 0) {
      ctx.beginPath(); ctx.moveTo(cl * 0.3, -cw * 0.15); ctx.quadraticCurveTo(cl * 0.6, 0, cl * 0.85, 0);
      ctx.strokeStyle = `rgba(200,190,160,0.1)`; ctx.lineWidth = 0.3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cl * 0.3, cw * 0.15); ctx.quadraticCurveTo(cl * 0.6, 0, cl * 0.85, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class PetalManager {
  #centerX = 0;
  #centerY = 0;
  #radius = 0;
  #petals: Petal[] = [];
  #drawOrder: number[] = [];
  #hoveredPetal: Petal | null = null;
  #rippleQueue: { index: number; time: number }[] = [];
  #params: FlowerParams;

  constructor(centerX: number, centerY: number, radius: number, params: FlowerParams) {
    this.#centerX = centerX; this.#centerY = centerY; this.#radius = radius;
    this.#params = params;
    const rng = new SeedRandom(params.seed + 999);

    // Outer layer
    for (let i = 0; i < params.petalCount; i++) {
      this.#petals.push(new Petal(i, params.petalCount, centerX, centerY, radius, params, 0, rng));
    }
    // Inner layer if applicable
    if (params.hasInnerPetals && params.petalLayers > 1) {
      const innerCount = Math.floor(params.petalCount * params.innerPetalRatio);
      for (let i = 0; i < innerCount; i++) {
        this.#petals.push(new Petal(i + params.petalCount, innerCount, centerX, centerY, radius, params, 1, rng));
      }
    }

    this.#drawOrder = this.#petals.map((_, i) => i).sort((a, b) => {
      return Math.sin(this.#petals[a].baseAngle) - Math.sin(this.#petals[b].baseAngle);
    });
  }

  updatePosition(x: number, y: number) { this.#centerX = x; this.#centerY = y; }

  startBloom() {
    const baseDelay = 40;
    this.#petals.forEach((p, i) => {
      p.startBloom(i * baseDelay + Utils.randomRange(0, 25));
    });
  }

  getPetalAtPoint(x: number, y: number) {
    for (let i = this.#petals.length - 1; i >= 0; i--) {
      if (this.#petals[i].containsPoint(x, y, this.#centerX, this.#centerY)) return this.#petals[i];
    }
    return null;
  }

  handleHover(x: number, y: number) {
    const petal = this.getPetalAtPoint(x, y);
    if (this.#hoveredPetal !== petal) {
      this.#hoveredPetal?.setHovered(false);
      petal?.setHovered(true);
      this.#hoveredPetal = petal;
    }
    return petal;
  }

  handleClick(x: number, y: number) {
    const petal = this.getPetalAtPoint(x, y);
    if (petal) {
      petal.triggerClick();
      this.#scheduleRipple(petal.index);
      return petal;
    }
    return null;
  }

  #scheduleRipple(sourceIndex: number) {
    const now = performance.now();
    const petalCount = this.#params.petalCount;
    [-1, 1].forEach((dir, i) => {
      this.#rippleQueue.push({ index: (sourceIndex + dir + petalCount) % petalCount, time: now + 40 * (i + 1) });
      this.#rippleQueue.push({ index: (sourceIndex + dir * 2 + petalCount) % petalCount, time: now + 40 * (i + 1) + 40 });
    });
  }

  triggerAllBloom() { this.#petals.forEach(p => p.triggerBloom()); }

  setCuriositySide(angle: number) {
    this.#petals.forEach(p => {
      let diff = Math.abs(p.baseAngle - angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      p.bendStiffness = diff < Math.PI / 2 ? 1.5 : 1;
    });
  }

  resetCuriosity() {
    this.#petals.forEach(p => { p.bendStiffness = Utils.randomRange(0.06, 0.18); });
  }

  getHoveredPetal() { return this.#hoveredPetal; }
  clearHovered() { this.#hoveredPetal = null; }

  update(deltaTime: number, wind: Vec2) {
    const now = performance.now();
    this.#rippleQueue = this.#rippleQueue.filter(r => {
      if (r.time <= now) { this.#petals[r.index]?.triggerRipple(); return false; }
      return true;
    });
    this.#petals.forEach(p => p.update(deltaTime, wind));
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const idx of this.#drawOrder) {
      this.#petals[idx].draw(ctx, this.#centerX, this.#centerY, this.#params);
    }
  }
}
