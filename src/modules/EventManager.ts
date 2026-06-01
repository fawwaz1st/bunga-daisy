import { Utils } from '../config.js';
import type { WeatherSystem } from './WeatherSystem.js';

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  headSize: number;
  alpha: number;
  hue: number;
}

interface Lantern {
  x: number;
  y: number;
  vy: number;
  wobblePhase: number;
  wobbleSpeed: number;
  size: number;
  glowSize: number;
  color: string;
  alpha: number;
  drift: number;
}

interface AuroraBand {
  yBase: number;
  amplitude: number;
  phase: number;
  speed: number;
  color: string;
  thickness: number;
}

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  flapSpeed: number;
  size: number;
}

interface BioSpot {
  x: number;
  y: number;
  baseRadius: number;
  pulsePhase: number;
  pulseSpeed: number;
  color: string;
}

interface WindStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
  width: number;
}

interface WindLeaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  color: string;
  alpha: number;
}

export type EventType =
  | 'meteor_shower'
  | 'aurora'
  | 'floating_lanterns'
  | 'bird_flock'
  | 'bioluminescence'
  | 'wind_gust'
  | 'rainbow';

const EVENT_MIN_INTERVAL = 15000; // 15s
const EVENT_MAX_INTERVAL = 45000; // 45s
const EVENT_MIN_DURATION = 10000; // 10s
const EVENT_MAX_DURATION = 20000; // 20s

export class EventManager {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;

  #weather: WeatherSystem | null = null;

  #eventTimer = 0;
  #nextEvent = Utils.randomRange(EVENT_MIN_INTERVAL, EVENT_MAX_INTERVAL);
  #currentEvent: EventType | null = null;
  #eventDuration = 0;
  #eventProgress = 0;

  #meteors: Meteor[] = [];
  #meteorSpawnTimer = 0;

  #auroraBands: AuroraBand[] = [];
  #auroraAlpha = 0;

  #lanterns: Lantern[] = [];

  #birds: Bird[] = [];
  #birdMode: 'v' | 'chaotic' = 'v';

  #bioSpots: BioSpot[] = [];
  #bioAlpha = 0;

  #windStreaks: WindStreak[] = [];
  #windLeaves: WindLeaf[] = [];
  #windAlpha = 0;

  // Cache hexToRgba results to avoid parseInt per draw
  #rgbaCache: Map<string, string> = new Map();

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.#ctx = ctx;
    this.#width = width;
    this.#height = height;
  }

  setWeatherSystem(weather: WeatherSystem) {
    this.#weather = weather;
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  update(deltaTime: number) {
    this.#eventTimer += deltaTime;

    if (!this.#currentEvent && this.#eventTimer >= this.#nextEvent) {
      this.#triggerRandomEvent();
    }

    if (this.#currentEvent) {
      this.#eventProgress += deltaTime;
      if (this.#eventProgress >= this.#eventDuration) {
        this.#endCurrentEvent();
      } else {
        this.#updateActiveEvent(deltaTime);
      }
    }
  }

  #triggerRandomEvent() {
    const candidates: EventType[] = [
      'meteor_shower',
      'aurora',
      'floating_lanterns',
      'bird_flock',
      'bioluminescence',
      'wind_gust',
    ];
    if (this.#weather?.current === 'rain') candidates.push('rainbow');

    let pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (pick === this.#currentEvent && candidates.length > 1) {
      pick = candidates[(candidates.indexOf(pick) + 1) % candidates.length];
    }

    this.#currentEvent = pick;
    this.#eventProgress = 0;
    this.#eventDuration = Utils.randomRange(EVENT_MIN_DURATION, EVENT_MAX_DURATION);
    this.#eventTimer = 0;

    switch (pick) {
      case 'meteor_shower':
        this.#meteors = [];
        this.#meteorSpawnTimer = 0;
        break;
      case 'aurora':
        this.#initAurora();
        break;
      case 'floating_lanterns':
        this.#initLanterns();
        break;
      case 'bird_flock':
        this.#initBirds();
        break;
      case 'bioluminescence':
        this.#initBioluminescence();
        break;
      case 'wind_gust':
        this.#initWindGust();
        break;
      case 'rainbow':
        this.#weather?.triggerRainbow();
        break;
    }
  }

  #endCurrentEvent() {
    this.#currentEvent = null;
    this.#eventProgress = 0;
    this.#eventTimer = 0;
    this.#nextEvent = Utils.randomRange(EVENT_MIN_INTERVAL, EVENT_MAX_INTERVAL);
    this.#meteors = [];
    this.#auroraBands = [];
    this.#lanterns = [];
    this.#birds = [];
    this.#bioSpots = [];
    this.#windStreaks = [];
    this.#windLeaves = [];
    this.#rgbaCache.clear();
  }

  #updateActiveEvent(deltaTime: number) {
    const dt = deltaTime * 0.001;
    const fadeIn = Math.min(1, this.#eventProgress / 1500);
    const fadeOut = this.#eventProgress > this.#eventDuration - 2000
      ? (this.#eventDuration - this.#eventProgress) / 2000
      : 1;
    const globalAlpha = fadeIn * fadeOut;

    switch (this.#currentEvent) {
      case 'meteor_shower':
        this.#updateMeteors(dt, globalAlpha);
        break;
      case 'aurora':
        this.#updateAurora(dt, globalAlpha);
        break;
      case 'floating_lanterns':
        this.#updateLanterns(dt, globalAlpha);
        break;
      case 'bird_flock':
        this.#updateBirds(dt, globalAlpha);
        break;
      case 'bioluminescence':
        this.#updateBioluminescence(dt, globalAlpha);
        break;
      case 'wind_gust':
        this.#updateWindGust(dt, globalAlpha);
        break;
    }
  }

  #updateMeteors(dt: number, _globalAlpha: number) {
    this.#meteorSpawnTimer -= dt * 1000;
    if (this.#meteorSpawnTimer <= 0) {
      const count = Utils.randomInt(1, 2);
      for (let i = 0; i < count; i++) {
        this.#meteors.push(this.#spawnMeteor());
      }
      this.#meteorSpawnTimer = Utils.randomRange(80, 350);
    }

    for (const m of this.#meteors) {
      m.x += m.vx;
      m.y += m.vy;
      const headroom = this.#height * 0.45;
      if (m.y < headroom) {
        m.alpha = Utils.lerp(m.alpha, 1, 0.05);
      } else {
        m.alpha = Math.max(0, 1 - (m.y - headroom) / 250);
      }
    }
    this.#meteors = this.#meteors.filter(
      (m) => m.y < this.#height + 60 && m.x > -200 && m.alpha > 0.01
    );
  }

  #spawnMeteor(): Meteor {
    const side = Math.random() > 0.3 ? 'top' : 'right';
    let x: number, y: number;
    if (side === 'top') {
      x = Utils.randomRange(this.#width * 0.1, this.#width * 1.1);
      y = Utils.randomRange(-80, this.#height * 0.25);
    } else {
      x = Utils.randomRange(this.#width * 0.8, this.#width + 100);
      y = Utils.randomRange(-40, this.#height * 0.35);
    }
    const speed = Utils.randomRange(6, 14);
    const angle = Utils.randomRange(Math.PI * 0.55, Math.PI * 0.85);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: Utils.randomRange(60, 160),
      headSize: Utils.randomRange(2, 4.5),
      alpha: 0,
      hue: Math.random() > 0.8 ? Utils.randomRange(40, 60) : 50,
    };
  }

  #drawMeteors() {
    const ctx = this.#ctx;
    for (const m of this.#meteors) {
      if (m.alpha <= 0.01) continue;

      const tailX = m.x - m.vx * (m.length / 10);
      const tailY = m.y - m.vy * (m.length / 10);

      const headGlow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.headSize * 5);
      headGlow.addColorStop(0, `rgba(255,255,235,${m.alpha * 0.9})`);
      headGlow.addColorStop(0.3, `rgba(255,250,200,${m.alpha * 0.4})`);
      headGlow.addColorStop(1, `rgba(255,250,200,0)`);
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.headSize * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,245,${m.alpha})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.headSize, 0, Math.PI * 2);
      ctx.fill();

      const streakGrad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      streakGrad.addColorStop(0, `rgba(255,255,235,${m.alpha * 0.7})`);
      streakGrad.addColorStop(0.5, `rgba(255,250,210,${m.alpha * 0.25})`);
      streakGrad.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.strokeStyle = streakGrad;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }

  #initAurora() {
    const colors = ['rgba(100,255,150,', 'rgba(255,120,200,', 'rgba(180,130,255,'];
    this.#auroraBands = [];
    for (let i = 0; i < 4; i++) {
      this.#auroraBands.push({
        yBase: this.#height * Utils.randomRange(0.08, 0.35),
        amplitude: Utils.randomRange(30, 70),
        phase: Utils.randomRange(0, Math.PI * 2),
        speed: Utils.randomRange(0.2, 0.5),
        color: colors[i % colors.length],
        thickness: Utils.randomRange(25, 55),
      });
    }
    this.#auroraAlpha = 1;
  }

  #updateAurora(dt: number, _globalAlpha: number) {
    for (const band of this.#auroraBands) {
      band.phase += dt * band.speed;
    }
    if (this.#eventProgress > this.#eventDuration * 0.7) {
      this.#auroraAlpha *= 0.99;
    }
  }

  #drawAurora() {
    if (this.#auroraAlpha <= 0.005) return;
    const ctx = this.#ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const band of this.#auroraBands) {
      const alpha = this.#auroraAlpha * 0.35;
      const steps = 40;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * this.#width;
        const wave = Math.sin(x * 0.004 + band.phase) * band.amplitude;
        const ripple = Math.sin(x * 0.012 - band.phase * 1.3) * (band.amplitude * 0.3);
        const y = band.yBase + wave + ripple;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const x = (i / steps) * this.#width;
        const wave = Math.sin(x * 0.004 + band.phase) * band.amplitude;
        const ripple = Math.sin(x * 0.012 - band.phase * 1.3) * (band.amplitude * 0.3);
        const y = band.yBase + wave + ripple + band.thickness;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = `${band.color}${alpha})`;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * this.#width;
        const wave = Math.sin(x * 0.004 + band.phase) * band.amplitude;
        const ripple = Math.sin(x * 0.012 - band.phase * 1.3) * (band.amplitude * 0.3);
        const y = band.yBase + wave + ripple;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `${band.color}${alpha * 1.5})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  #initLanterns() {
    const colors = ['#ff8844', '#ffcc44', '#ff6644', '#ffaa33', '#ff7744'];
    this.#lanterns = [];
    for (let i = 0; i < 6; i++) {
      this.#lanterns.push({
        x: Utils.randomRange(this.#width * 0.05, this.#width * 0.95),
        y: this.#height + Utils.randomRange(10, 120),
        vy: Utils.randomRange(-0.25, -0.65),
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: Utils.randomRange(0.8, 1.8),
        size: Utils.randomRange(5, 9),
        glowSize: Utils.randomRange(18, 32),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0,
        drift: Utils.randomRange(-0.4, 0.4),
      });
    }
  }

  #updateLanterns(dt: number, _globalAlpha: number) {
    for (const l of this.#lanterns) {
      l.y += l.vy * dt * 60;
      l.wobblePhase += dt * l.wobbleSpeed;
      l.x += Math.sin(l.wobblePhase) * 0.5 + l.drift * dt;

      if (l.y > this.#height - 60) {
        l.alpha = Utils.lerp(l.alpha, 1, 0.03);
      }
      if (l.y < this.#height * 0.25) {
        l.alpha *= 0.98;
      }
    }
    this.#lanterns = this.#lanterns.filter((l) => l.y > -40 && l.alpha > 0.01);

    if (this.#lanterns.length < 5 && this.#eventProgress < this.#eventDuration - 3000) {
      const colors = ['#ff8844', '#ffcc44', '#ff6644', '#ffaa33', '#ff7744'];
      this.#lanterns.push({
        x: Utils.randomRange(this.#width * 0.05, this.#width * 0.95),
        y: this.#height + Utils.randomRange(10, 60),
        vy: Utils.randomRange(-0.25, -0.65),
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: Utils.randomRange(0.8, 1.8),
        size: Utils.randomRange(5, 9),
        glowSize: Utils.randomRange(18, 32),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0,
        drift: Utils.randomRange(-0.4, 0.4),
      });
    }
  }

  #drawLanterns() {
    const ctx = this.#ctx;
    for (const l of this.#lanterns) {
      if (l.alpha <= 0.01) continue;

      const glow = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.glowSize);
      const baseColor = this.#hexToRgba(l.color, l.alpha * 0.35);
      const fadeColor = this.#hexToRgba(l.color, 0);
      glow.addColorStop(0, baseColor);
      glow.addColorStop(0.5, this.#hexToRgba(l.color, l.alpha * 0.12));
      glow.addColorStop(1, fadeColor);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.#hexToRgba(l.color, l.alpha);
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.size, l.size * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,240,200,${l.alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(l.x, l.y - l.size * 0.15, l.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #initBirds() {
    this.#birdMode = Math.random() > 0.4 ? 'v' : 'chaotic';
    this.#birds = [];
    const count = Utils.randomInt(10, 15);

    if (this.#birdMode === 'v') {
      const startX = -60;
      const startY = Utils.randomRange(this.#height * 0.1, this.#height * 0.35);
      const speed = Utils.randomRange(3, 5.5);
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2);
        const side = i % 2 === 0 ? 1 : -1;
        const offsetX = -row * 28;
        const offsetY = side * row * 16;
        this.#birds.push({
          x: startX + offsetX,
          y: startY + offsetY,
          vx: speed,
          vy: Utils.randomRange(-0.15, 0.15),
          phase: i * 0.3,
          flapSpeed: Utils.randomRange(8, 14),
          size: Utils.randomRange(6, 10),
        });
      }
    } else {
      for (let i = 0; i < count; i++) {
        this.#birds.push({
          x: Utils.randomRange(-80, this.#width * 0.3),
          y: Utils.randomRange(this.#height * 0.05, this.#height * 0.45),
          vx: Utils.randomRange(2.5, 5),
          vy: Utils.randomRange(-0.8, 0.8),
          phase: Math.random() * Math.PI * 2,
          flapSpeed: Utils.randomRange(6, 12),
          size: Utils.randomRange(5, 9),
        });
      }
    }
  }

  #updateBirds(dt: number, _globalAlpha: number) {
    const time = this.#eventProgress * 0.001;
    for (const b of this.#birds) {
      b.x += b.vx;
      b.y += b.vy + Math.sin(time * 1.5 + b.phase) * 0.4;
      if (this.#birdMode === 'chaotic') {
        b.vy += Math.sin(time * 2 + b.phase) * 0.02;
      }
    }
    this.#birds = this.#birds.filter((b) => b.x < this.#width + 100);
  }

  #drawBirds() {
    const ctx = this.#ctx;
    const time = this.#eventProgress * 0.001;
    ctx.save();
    for (const b of this.#birds) {
      const wingY = Math.sin(time * b.flapSpeed + b.phase) * (b.size * 1.2);
      ctx.fillStyle = 'rgba(35, 35, 45, 0.9)';

      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.size * 0.35, b.size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(b.x - b.size * 0.3, b.y);
      ctx.lineTo(b.x - b.size * 0.1, b.y - wingY);
      ctx.lineTo(b.x + b.size * 0.15, b.y);
      ctx.lineTo(b.x + b.size * 0.35, b.y - wingY * 0.85);
      ctx.lineTo(b.x + b.size * 0.5, b.y);
      ctx.fill();
    }
    ctx.restore();
  }

  #initBioluminescence() {
    const colors = ['#44ffaa', '#33ddcc', '#88ff66', '#55ffcc'];
    this.#bioSpots = [];
    for (let i = 0; i < 25; i++) {
      this.#bioSpots.push({
        x: Utils.randomRange(0, this.#width),
        y: Utils.randomRange(this.#height * 0.8, this.#height * 0.98),
        baseRadius: Utils.randomRange(3, 8),
        pulsePhase: Utils.randomRange(0, Math.PI * 2),
        pulseSpeed: Utils.randomRange(1.5, 3.5),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    this.#bioAlpha = 1;
  }

  #updateBioluminescence(_dt: number, _globalAlpha: number) {
    if (this.#eventProgress > this.#eventDuration * 0.65) {
      this.#bioAlpha *= 0.99;
    }
  }

  #drawBioluminescence() {
    if (this.#bioAlpha <= 0.005) return;
    const ctx = this.#ctx;
    const time = this.#eventProgress * 0.001;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const spot of this.#bioSpots) {
      const pulse = Math.sin(time * spot.pulseSpeed + spot.pulsePhase) * 0.5 + 0.5;
      const radius = spot.baseRadius * (0.6 + pulse * 0.7);
      const alpha = this.#bioAlpha * (0.35 + pulse * 0.45);

      const grad = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, radius * 3);
      grad.addColorStop(0, this.#hexToRgba(spot.color, alpha));
      grad.addColorStop(0.5, this.#hexToRgba(spot.color, alpha * 0.35));
      grad.addColorStop(1, this.#hexToRgba(spot.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, radius * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.#hexToRgba('#ccffee', alpha * 0.8);
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  #initWindGust() {
    this.#windStreaks = [];
    this.#windLeaves = [];
    this.#windAlpha = 1;

    for (let i = 0; i < 20; i++) {
      this.#windStreaks.push({
        x: Utils.randomRange(-200, this.#width),
        y: Utils.randomRange(0, this.#height * 0.85),
        length: Utils.randomRange(40, 180),
        speed: Utils.randomRange(12, 28),
        alpha: Utils.randomRange(0.1, 0.35),
        width: Utils.randomRange(1, 3),
      });
    }

    const leafColors = ['#8ba878', '#aabb88', '#6b8858', '#9bb888'];
    for (let i = 0; i < 8; i++) {
      this.#windLeaves.push({
        x: Utils.randomRange(-100, this.#width * 0.4),
        y: Utils.randomRange(this.#height * 0.4, this.#height * 0.9),
        vx: Utils.randomRange(8, 18),
        vy: Utils.randomRange(-1.5, 2.5),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: Utils.randomRange(-8, 8),
        size: Utils.randomRange(4, 8),
        color: leafColors[Math.floor(Math.random() * leafColors.length)],
        alpha: Utils.randomRange(0.5, 0.9),
      });
    }
  }

  #updateWindGust(dt: number, _globalAlpha: number) {
    for (const s of this.#windStreaks) {
      s.x += s.speed;
      if (s.x > this.#width + s.length) {
        s.x = -s.length;
        s.y = Utils.randomRange(0, this.#height * 0.85);
      }
    }

    for (const l of this.#windLeaves) {
      l.x += l.vx;
      l.y += l.vy;
      l.rotation += l.rotSpeed * dt;
      if (l.x > this.#width + 30 || l.y > this.#height + 20) {
        l.x = Utils.randomRange(-60, -10);
        l.y = Utils.randomRange(this.#height * 0.4, this.#height * 0.9);
      }
    }

    if (this.#eventProgress > this.#eventDuration * 0.7) {
      this.#windAlpha *= 0.98;
    }
  }

  #drawWindGust() {
    if (this.#windAlpha <= 0.005) return;
    const ctx = this.#ctx;

    ctx.save();
    for (const s of this.#windStreaks) {
      const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.length, s.y);
      grad.addColorStop(0, 'rgba(240,240,245,0)');
      grad.addColorStop(0.5, `rgba(240,240,245,${s.alpha * this.#windAlpha})`);
      grad.addColorStop(1, 'rgba(240,240,245,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.length, s.y + Utils.randomRange(-1, 1));
      ctx.stroke();
    }
    ctx.restore();

    for (const l of this.#windLeaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rotation);
      ctx.globalAlpha = l.alpha * this.#windAlpha;
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  draw() {
    if (!this.#currentEvent) return;
    switch (this.#currentEvent) {
      case 'meteor_shower':
        this.#drawMeteors();
        break;
      case 'aurora':
        this.#drawAurora();
        break;
      case 'floating_lanterns':
        this.#drawLanterns();
        break;
      case 'bird_flock':
        this.#drawBirds();
        break;
      case 'bioluminescence':
        this.#drawBioluminescence();
        break;
      case 'wind_gust':
        this.#drawWindGust();
        break;
    }
  }

  #hexToRgba(hex: string, alpha: number): string {
    const key = `${hex}|${alpha.toFixed(2)}`;
    const cached = this.#rgbaCache.get(key);
    if (cached) return cached;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const result = `rgba(${r},${g},${b},${alpha})`;
    if (this.#rgbaCache.size > 500) this.#rgbaCache.clear();
    this.#rgbaCache.set(key, result);
    return result;
  }
}
