/**
 * Stem with procedural params
 */
import { Utils, Easing } from '../config.js';
import type { Vec2 } from '../config.js';
import type { FlowerParams } from '../utils/FlowerParams.js';

interface Segment { x: number; y: number; prevX: number; prevY: number; velocityX: number; velocityY: number; flexibility: number; }
interface LeafDef { segmentIndex: number; size: number; baseAngle: number; angle: number; angleVelocity: number; unfold: number; side: number; shape: string; }

export class Stem {
  #baseX = 0;
  #baseY = 0;
  #height = 0;
  #segmentCount = 8;
  #segments: Segment[] = [];
  #stiffness = 0.4;
  #damping = 0.88;
  #gravity = 0.01;
  #windResponse = 0.15;
  #angularVelocity = 0;
  #secondaryWave = 0;
  #waveSpeed = 2.5;
  #leaves: LeafDef[] = [];
  #growthProgress = 0;
  #visible = false;
  #slowMoActive = false;
  #slowMoProgress = 0;
  #flowerPos: { x: number; y: number; angle: number } = { x: 0, y: 0, angle: 0 };
  #params: FlowerParams;

  constructor(baseX: number, baseY: number, height: number, params: FlowerParams) {
    this.#baseX = baseX; this.#baseY = baseY; this.#height = height; this.#params = params;
    this.#initSegments();
    const leafShapes = ['oval', 'pointed', 'round', 'heart'];
    const leafPositions = [2, 4, 5, 6];
    const leafSizes = [18, 14, 10, 8];
    const leafAngles = [-0.5, 0.6, -0.4, 0.3];
    const leafSides = [-1, 1, -1, 1];
    
    for (let i = 0; i < params.leafCount; i++) {
      this.#leaves.push({
        segmentIndex: leafPositions[i % leafPositions.length],
        size: leafSizes[i % leafSizes.length] * Utils.randomRange(0.8, 1.2),
        baseAngle: leafAngles[i % leafAngles.length],
        angle: leafAngles[i % leafAngles.length],
        angleVelocity: 0, unfold: 0, side: leafSides[i % leafSides.length],
        shape: leafShapes[i % leafShapes.length]
      });
    }
  }

  #initSegments() {
    this.#segments = [];
    const segH = this.#height / this.#segmentCount;
    for (let i = 0; i <= this.#segmentCount; i++) {
      this.#segments.push({ x: 0, y: -i * segH, prevX: 0, prevY: -i * segH, velocityX: 0, velocityY: 0, flexibility: 0.3 + (i / this.#segmentCount) * 0.7 });
    }
  }

  startGrowth() { this.#visible = true; this.#growthProgress = 0; }

  getFlowerPosition() {
    if (this.#segments.length === 0) return { x: this.#baseX, y: this.#baseY - this.#height, angle: 0 };
    const top = this.#segments[this.#segments.length - 1];
    const prev = this.#segments[this.#segments.length - 2];
    const dx = top.x - (prev ? prev.x : 0);
    const dy = top.y - (prev ? prev.y : top.y + 10);
    this.#flowerPos.x = this.#baseX + top.x * this.#growthProgress;
    this.#flowerPos.y = this.#baseY + top.y * this.#growthProgress;
    this.#flowerPos.angle = Math.atan2(dx, -dy) * 0.6;
    return this.#flowerPos;
  }

  resize(baseX: number, baseY: number) {
    this.#baseX = baseX; this.#baseY = baseY;
  }

  update(deltaTime: number, wind: Vec2) {
    if (!this.#visible) return;
    const dt = deltaTime * 0.001;
    const time = performance.now() * 0.001;

    if (this.#growthProgress < 1) {
      this.#growthProgress += dt * 0.35;
      this.#growthProgress = Math.min(1, this.#growthProgress);
      this.#leaves.forEach((leaf) => {
        const threshold = 0.3 + (leaf.segmentIndex / this.#segmentCount) * 0.4;
        if (this.#growthProgress > threshold) {
          leaf.unfold = Easing.cubicOut(Math.min(1, (this.#growthProgress - threshold) / 0.25));
        }
      });
    }

    this.#secondaryWave = Math.sin(time * this.#waveSpeed) * 0.02;
    if (this.#slowMoActive) {
      this.#slowMoProgress += dt;
      if (this.#slowMoProgress > 3) { this.#slowMoActive = false; this.#slowMoProgress = 0; }
    }

    const active = Math.ceil(this.#segmentCount * this.#growthProgress);
    for (let i = 1; i <= active; i++) {
      const seg = this.#segments[i];
      const ratio = i / this.#segmentCount;
      const wf = wind.x * this.#windResponse * seg.flexibility;
      const wfy = wind.y * this.#windResponse * 0.3;
      const sway = Math.sin(time * 1.2 + i * 0.3) * 0.3 * seg.flexibility;
      let smf = 0;
      if (this.#slowMoActive) {
        const env = Math.exp(-this.#slowMoProgress * 0.8);
        smf = Math.sin(this.#slowMoProgress * 4) * env * 3 * ratio;
      }
      const vx = (seg.x - seg.prevX) * this.#damping;
      const vy = (seg.y - seg.prevY) * this.#damping;
      seg.prevX = seg.x; seg.prevY = seg.y;
      seg.x += vx + (wf + sway + smf) * dt * 60;
      seg.y += vy + (wfy - this.#gravity) * dt * 60;
    }

    const segLen = this.#height / this.#segmentCount;
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 1; i <= active; i++) {
        const seg = this.#segments[i];
        const prev = this.#segments[i - 1];
        const dx = seg.x - prev.x;
        const dy = seg.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const diff = (segLen - dist) / dist;
        const ox = dx * diff * 0.5;
        const oy = dy * diff * 0.5;
        seg.x += ox * this.#stiffness;
        seg.y += oy * this.#stiffness;
        const upright = -seg.x * 0.02 * (1 - seg.flexibility * 0.5);
        seg.x += upright;
      }
    }
    this.#segments[0].x = 0; this.#segments[0].y = 0;

    this.#leaves.forEach(leaf => {
      if (leaf.unfold <= 0) return;
      const seg = this.#segments[Math.min(leaf.segmentIndex, active)];
      if (!seg) return;
      const sv = seg.x - seg.prevX;
      const target = leaf.baseAngle + sv * 0.5 + this.#secondaryWave * leaf.side;
      leaf.angleVelocity += (target - leaf.angle) * 0.15;
      leaf.angleVelocity *= 0.85;
      leaf.angle += leaf.angleVelocity;
    });
  }

  triggerSlowSway() {
    this.#slowMoActive = true; this.#slowMoProgress = 0;
    const mid = Math.floor(this.#segmentCount / 2);
    for (let i = mid; i <= this.#segmentCount; i++) {
      this.#segments[i].x += (Math.random() - 0.5) * 5;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.#visible || this.#growthProgress <= 0) return;
    ctx.save();
    ctx.translate(this.#baseX, this.#baseY);
    const active = Math.ceil(this.#segmentCount * this.#growthProgress);

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= active; i++) {
      const seg = this.#segments[i];
      const prog = i <= active ? 1 : (this.#growthProgress * this.#segmentCount - i + 1);
      points.push({ x: seg.x * Math.min(1, prog), y: seg.y * this.#growthProgress });
    }

    if (points.length >= 2) {
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        const t = 0.5;
        const cp1x = p1.x + (p2.x - p0.x) * t / 3;
        const cp1y = p1.y + (p2.y - p0.y) * t / 3;
        const cp2x = p2.x - (p3.x - p1.x) * t / 3;
        const cp2y = p2.y - (p3.y - p1.y) * t / 3;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      const grad = ctx.createLinearGradient(0, 0, 0, -this.#height * this.#growthProgress);
      grad.addColorStop(0, this.#params.stemColor);
      grad.addColorStop(0.3, '#8ba878');
      grad.addColorStop(0.7, '#8ba878');
      grad.addColorStop(1, '#9bc878');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 5 - this.#growthProgress * 1.5;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    }

    this.#leaves.forEach(leaf => {
      if (leaf.unfold <= 0) return;
      const segIdx = Math.min(leaf.segmentIndex, active);
      const seg = this.#segments[segIdx];
      if (!seg) return;
      const lx = seg.x * this.#growthProgress;
      const ly = seg.y * this.#growthProgress;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(leaf.angle);
      ctx.scale(leaf.unfold, leaf.unfold);

      // Leaf shape variations
      ctx.beginPath(); ctx.moveTo(0, 0);
      if (leaf.shape === 'heart') {
        ctx.bezierCurveTo(leaf.size * 0.2, -leaf.size * 0.5, leaf.size * 0.6, -leaf.size * 0.4, leaf.size * 0.5, -leaf.size * 0.2);
        ctx.bezierCurveTo(leaf.size * 0.8, 0, leaf.size * 0.5, leaf.size * 0.5, 0, leaf.size * 0.3);
        ctx.bezierCurveTo(-leaf.size * 0.5, leaf.size * 0.5, -leaf.size * 0.8, 0, -leaf.size * 0.5, -leaf.size * 0.2);
        ctx.bezierCurveTo(-leaf.size * 0.6, -leaf.size * 0.4, -leaf.size * 0.2, -leaf.size * 0.5, 0, 0);
      } else if (leaf.shape === 'round') {
        ctx.ellipse(leaf.size * 0.4, 0, leaf.size * 0.5, leaf.size * 0.3, 0, 0, Math.PI * 2);
      } else if (leaf.shape === 'pointed') {
        ctx.bezierCurveTo(leaf.size * 0.3, -leaf.size * 0.3, leaf.size * 0.7, -leaf.size * 0.15, leaf.size, 0);
        ctx.bezierCurveTo(leaf.size * 0.7, leaf.size * 0.15, leaf.size * 0.3, leaf.size * 0.3, 0, 0);
      } else {
        ctx.bezierCurveTo(leaf.size * 0.3, -leaf.size * 0.4, leaf.size * 0.8, -leaf.size * 0.2, leaf.size, 0);
        ctx.bezierCurveTo(leaf.size * 0.8, leaf.size * 0.2, leaf.size * 0.3, leaf.size * 0.4, 0, 0);
      }

      const lgrad = ctx.createLinearGradient(0, 0, leaf.size, 0);
      lgrad.addColorStop(0, this.#params.stemColor);
      lgrad.addColorStop(0.5, '#9bb888');
      lgrad.addColorStop(1, '#a8c888');
      ctx.fillStyle = lgrad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(leaf.size * 0.5, leaf.side * 1, leaf.size * 0.85, 0);
      ctx.strokeStyle = 'rgba(80,100,60,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }
}
