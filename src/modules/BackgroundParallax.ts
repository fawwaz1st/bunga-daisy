/**
 * BackgroundParallax - OffscreenCanvas static layer caching + batched drawing
 * Optimized: hills/trees/grasses rendered ONCE (no parallax = no flicker).
 * Only dynamic things (stars, sun/moon, clouds, fireflies) update per frame.
 */
import { ColorUtils } from '../utils/ColorUtils.js';
import { Utils } from '../config.js';

export class BackgroundParallax {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;
  #time = 0;
  #dayProgress = 0.25;
  #cycleDuration = 90;
  #offsetX = 0;
  #offsetY = 0;
  #scale = 1;
  #windStrength = 0;

  // Static cached layer (everything that doesn't animate per frame)
  #staticCanvas: HTMLCanvasElement;
  #staticCtx: CanvasRenderingContext2D;
  #staticDirty = true;

  // Dynamic elements (must animate)
  #stars: { x: number; y: number; size: number; twinklePhase: number; twinkleSpeed: number; brightTwinkle: boolean }[] = [];
  #shootingStar: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number } | null = null;
  #shootingStarTimer = 0;

  #clouds: {
    x: number;
    y: number;
    puffs: { ox: number; oy: number; r: number }[];
    speed: number;
    opacity: number;
    scale: number;
    darkening: number;
  }[] = [];

  #mountains: { points: { nx: number; ny: number }[]; hue: number; sat: number; lit: number }[] = [];

  #hills: {
    points: { nx: number; ny: number }[];
    baseY: number;
    amplitude: number;
    hue: number;
    sat: number;
    lit: number;
  }[] = [];

  #fireflies: { nx: number; ny: number; phase: number; speed: number; glowPhase: number }[] = [];

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.#ctx = ctx;
    this.#width = width;
    this.#height = height;
    this.#scale = Math.min(width, height) / 800;

    this.#staticCanvas = document.createElement('canvas');
    this.#staticCtx = this.#staticCanvas.getContext('2d')!;
    this.resize(width, height);
    this.#initAllElements();
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#scale = Math.min(width, height) / 800;
    this.#staticCanvas.width = width;
    this.#staticCanvas.height = height;
    this.#staticDirty = true;
  }

  #initAllElements() {
    this.#generateStars();
    this.#generateMountains();
    this.#generateHills();
    this.#generateClouds();
    this.#generateFireflies();
  }

  #generateStars() {
    this.#stars = [];
    for (let i = 0; i < 50; i++) {
      this.#stars.push({
        x: Math.random(),
        y: Math.random() * 0.45,
        size: Utils.randomRange(0.5, 2.0),
        twinklePhase: Utils.randomRange(0, Math.PI * 2),
        twinkleSpeed: Utils.randomRange(1.0, 5.0),
        brightTwinkle: Math.random() < 0.15,
      });
    }
  }

  #generateMountains() {
    this.#mountains = [];
    const configs = [
      { hue: 220, sat: 18, lit: 28 },
      { hue: 210, sat: 15, lit: 32 },
    ];
    configs.forEach((cfg, idx) => {
      const points: { nx: number; ny: number }[] = [];
      const segments = 20;
      const baseY = 0.38 + idx * 0.04;
      for (let i = 0; i <= segments; i++) {
        const nx = i / segments;
        const noise = Math.sin(nx * Math.PI * 7 + idx * 3) * 0.04 + Math.sin(nx * Math.PI * 13) * 0.02;
        points.push({ nx, ny: baseY - Math.abs(noise) });
      }
      this.#mountains.push({ points, hue: cfg.hue, sat: cfg.sat, lit: cfg.lit });
    });
  }

  #generateHills() {
    this.#hills = [];
    const configs = [
      { baseY: 0.52, amplitude: 0.06, hue: 100, sat: 30, lit: 40 },
      { baseY: 0.6, amplitude: 0.05, hue: 105, sat: 35, lit: 35 },
    ];
    configs.forEach((cfg) => {
      const points: { nx: number; ny: number }[] = [];
      const segments = 16;
      for (let i = 0; i <= segments; i++) {
        const nx = i / segments;
        const w1 = Math.sin(nx * Math.PI * 3 + cfg.baseY * 15) * cfg.amplitude * 0.6;
        const w2 = Math.sin(nx * Math.PI * 5) * cfg.amplitude * 0.4;
        points.push({ nx, ny: cfg.baseY - w1 - w2 });
      }
      this.#hills.push({
        points,
        baseY: cfg.baseY,
        amplitude: cfg.amplitude,
        hue: cfg.hue,
        sat: cfg.sat,
        lit: cfg.lit,
      });
    });
  }

  #generateClouds() {
    this.#clouds = [];
    // Fewer but fluffier clouds
    for (let i = 0; i < 5; i++) {
      const puffs = [];
      const pc = Utils.randomInt(7, 10);
      const bw = Utils.randomRange(0.1, 0.18);
      const scale = Utils.randomRange(0.8, 1.3);
      for (let j = 0; j < pc; j++) {
        puffs.push({
          ox: (j - pc / 2) * bw * 0.32 + Utils.randomRange(-0.008, 0.008),
          oy: Math.sin(j * 1.1) * 0.008 + Utils.randomRange(-0.003, 0.003),
          r: bw * (0.25 + Math.random() * 0.25) * scale,
        });
      }
      const speed = Utils.randomRange(0.002, 0.005) * (2.2 - scale);
      this.#clouds.push({
        x: Utils.randomRange(-0.15, 1.15),
        y: Utils.randomRange(0.05, 0.18),
        puffs,
        speed,
        opacity: Utils.randomRange(0.55, 0.85),
        scale,
        darkening: 0,
      });
    }
    this.#clouds.sort((a, b) => b.scale - a.scale);
  }

  #generateFireflies() {
    this.#fireflies = [];
    for (let i = 0; i < 12; i++) {
      this.#fireflies.push({
        nx: Utils.randomRange(0, 1),
        ny: Utils.randomRange(0.5, 0.88),
        phase: Utils.randomRange(0, Math.PI * 2),
        speed: Utils.randomRange(0.02, 0.04),
        glowPhase: Utils.randomRange(0, Math.PI * 2),
      });
    }
  }

  update(deltaTime: number, cursorX: number, cursorY: number, windStrength: number) {
    this.#time += deltaTime * 0.001;
    this.#dayProgress += deltaTime / (this.#cycleDuration * 1000);
    if (this.#dayProgress >= 1) this.#dayProgress -= 1;
    this.#windStrength = Utils.lerp(this.#windStrength, windStrength, 0.05);

    this.#offsetX = Utils.lerp(this.#offsetX, (cursorX - this.#width / 2) * 0.02, 0.03);
    this.#offsetY = Utils.lerp(this.#offsetY, (cursorY - this.#height / 2) * 0.01, 0.03);

    const weatherDarkening = Math.max(0, windStrength * 0.3);
    for (const c of this.#clouds) {
      c.x += c.speed * deltaTime * 0.001;
      if (c.x > 1.3) c.x = -0.3;
      c.darkening = Utils.lerp(c.darkening, weatherDarkening, 0.02);
    }

    for (const ff of this.#fireflies) {
      ff.nx += Math.sin(this.#time * ff.speed * 8 + ff.phase) * 0.0003;
      ff.ny += Math.cos(this.#time * ff.speed * 6 + ff.phase) * 0.0002;
      ff.glowPhase += deltaTime * 0.004;
      if (ff.nx < 0) ff.nx = 1;
      if (ff.nx > 1) ff.nx = 0;
    }

    this.#shootingStarTimer -= deltaTime * 0.001;
    if (!this.#shootingStar && this.#shootingStarTimer <= 0 && Math.random() < 0.008) {
      const startX = Utils.randomRange(0.1, 0.9);
      const startY = Utils.randomRange(0.05, 0.25);
      const angle = Utils.randomRange(Math.PI * 0.15, Math.PI * 0.35);
      const speed = Utils.randomRange(0.3, 0.6);
      this.#shootingStar = {
        x: startX * this.#width,
        y: startY * this.#height,
        vx: Math.cos(angle) * speed * this.#width,
        vy: Math.sin(angle) * speed * this.#height,
        life: 1,
        maxLife: Utils.randomRange(0.6, 1.2),
      };
      this.#shootingStarTimer = Utils.randomRange(5, 15);
    }
    if (this.#shootingStar) {
      this.#shootingStar.x += this.#shootingStar.vx * deltaTime * 0.001;
      this.#shootingStar.y += this.#shootingStar.vy * deltaTime * 0.001;
      this.#shootingStar.life -= deltaTime * 0.001 / this.#shootingStar.maxLife;
      if (this.#shootingStar.life <= 0 || this.#shootingStar.x > this.#width * 1.2 || this.#shootingStar.y > this.#height * 0.6) {
        this.#shootingStar = null;
      }
    }
  }

  setNightMode(progress: number) {
    if (progress > 0) {
      const target = 0.75 + progress * 0.15;
      this.#dayProgress = Utils.lerp(this.#dayProgress, target, 0.003);
    }
  }

  getDarkness() {
    const dayLight = Math.sin(this.#dayProgress * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    return 1 - dayLight;
  }

  getSunAltitude() {
    return Math.sin(this.#dayProgress * Math.PI * 2 - Math.PI / 2);
  }

  draw(flowerX?: number, flowerY?: number) {
    const darkness = this.getDarkness();
    if (this.#staticDirty) {
      this.#drawStaticLayer(darkness);
      this.#staticDirty = false;
    }

    this.#drawSky();
    this.#drawStars();
    this.#drawShootingStar();
    this.#drawSunMoon();
    this.#drawGodRays();
    this.#ctx.drawImage(this.#staticCanvas, 0, 0);
    this.#drawClouds();
    this.#drawFireflies();
    this.#drawVolumetricLight(flowerX, flowerY);
  }

  // ===================== STATIC LAYER (drawn once) =====================

  #drawStaticLayer(darkness: number) {
    const ctx = this.#staticCtx;
    ctx.clearRect(0, 0, this.#width, this.#height);
    this.#drawMountainsTo(ctx, darkness);
    this.#drawHillsTo(ctx, darkness);
    this.#drawGroundTo(ctx, darkness);
    this.#drawFlowerShadowTo(ctx);
    this.#drawTreesTo(ctx, darkness);
    this.#drawGrassesTo(ctx, darkness);
  }

  #drawMountainsTo(ctx: CanvasRenderingContext2D, darkness: number) {
    for (const mtn of this.#mountains) {
      const lit = Math.max(8, mtn.lit * (1 - darkness * 0.5));
      ctx.beginPath();
      ctx.moveTo(-50, this.#height);
      for (let i = 0; i < mtn.points.length; i++) {
        const pt = mtn.points[i];
        const x = pt.nx * this.#width * 1.2 - this.#width * 0.1;
        const y = pt.ny * this.#height;
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          const prev = mtn.points[i - 1];
          const px = prev.nx * this.#width * 1.2 - this.#width * 0.1;
          const cpx = (px + x) / 2;
          const cpy = (prev.ny * this.#height + y) / 2;
          ctx.quadraticCurveTo(px, prev.ny * this.#height, cpx, cpy);
        }
      }
      ctx.lineTo(this.#width + 50, this.#height);
      ctx.closePath();
      ctx.fillStyle = `hsla(${mtn.hue}, ${mtn.sat}%, ${lit}%, 0.85)`;
      ctx.fill();
    }
  }

  // Hills: drawn once, no parallax. Blends down to soil color naturally.
  #drawHillsTo(ctx: CanvasRenderingContext2D, darkness: number) {
    for (const hill of this.#hills) {
      const atmHue = hill.hue;
      const atmSat = hill.sat;
      const lit = hill.lit * (1 - darkness * 0.4);

      ctx.beginPath();
      ctx.moveTo(-50, this.#height);
      for (let i = 0; i < hill.points.length; i++) {
        const pt = hill.points[i];
        const x = pt.nx * this.#width * 1.2 - this.#width * 0.1;
        const y = pt.ny * this.#height;
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          const prev = hill.points[i - 1];
          const px = prev.nx * this.#width * 1.2 - this.#width * 0.1;
          const cpx = (px + x) / 2;
          const cpy = (prev.ny * this.#height + y) / 2;
          ctx.quadraticCurveTo(px, prev.ny * this.#height, cpx, cpy);
        }
      }
      ctx.lineTo(this.#width + 50, this.#height);
      ctx.closePath();
      ctx.fillStyle = `hsla(${atmHue}, ${atmSat}%, ${lit}%, 0.85)`;
      ctx.fill();

      // Subtle ridge highlight
      ctx.beginPath();
      for (let i = 0; i < hill.points.length; i++) {
        const pt = hill.points[i];
        const x = pt.nx * this.#width * 1.2 - this.#width * 0.1;
        const y = pt.ny * this.#height;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prev = hill.points[i - 1];
          const px = prev.nx * this.#width * 1.2 - this.#width * 0.1;
          const cpx = (px + x) / 2;
          const cpy = (prev.ny * this.#height + y) / 2;
          ctx.quadraticCurveTo(px, prev.ny * this.#height, cpx, cpy);
        }
      }
      ctx.lineWidth = 1.2 * this.#scale;
      ctx.strokeStyle = `hsla(${atmHue}, ${atmSat + 10}%, ${Math.min(80, lit + 15)}%, 0.3)`;
      ctx.stroke();
    }
  }

  // Ground: gradient blend from hill color to soil, no hard strip
  #drawGroundTo(ctx: CanvasRenderingContext2D, darkness: number) {
    const topY = this.#height * 0.6;
    const bottomY = this.#height;
    // Multi-stop gradient blending hills to soil
    const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
    const df = 1 - darkness * 0.3;
    grad.addColorStop(0, `hsla(95, 28%, ${42 * df}%, 1)`);
    grad.addColorStop(0.4, `hsla(75, 25%, ${35 * df}%, 1)`);
    grad.addColorStop(0.7, `hsla(45, 22%, ${28 * df}%, 1)`);
    grad.addColorStop(1, `hsla(30, 20%, ${22 * df}%, 1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, topY, this.#width, bottomY - topY);

    // Subtle pebbles - very small dots, blended
    const pebbleCount = Math.max(30, Math.floor(this.#width / 25));
    for (let i = 0; i < pebbleCount; i++) {
      const x = Math.random() * this.#width;
      const y = topY + Math.random() * (bottomY - topY) * 0.6;
      const r = Utils.randomRange(0.5, 1.2);
      ctx.fillStyle = `rgba(${80 + Math.random() * 40}, ${70 + Math.random() * 30}, ${50 + Math.random() * 20}, 0.5)`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #drawFlowerShadowTo(ctx: CanvasRenderingContext2D) {
    const centerX = this.#width * 0.5;
    const shadowY = this.#height * 0.85;
    const w = this.#width * 0.12;
    const h = this.#height * 0.025;
    const grad = ctx.createRadialGradient(centerX, shadowY, 0, centerX, shadowY, w);
    grad.addColorStop(0, 'rgba(0,0,0,0.22)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(centerX, shadowY, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trees: rendered once, no parallax, blend better with ground
  #drawTreesTo(ctx: CanvasRenderingContext2D, darkness: number) {
    const count = Math.max(6, Math.floor(this.#width / 120));
    const baseY = this.#height * 0.72;

    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const nx = Math.random();
      const h = this.#height * Utils.randomRange(0.06, 0.11) * (1 - depth * 0.3);
      const w = this.#width * Utils.randomRange(0.025, 0.05) * (1 - depth * 0.3);
      const type = Utils.randomInt(0, 4);
      const opacity = (0.35 + depth * 0.3) * (1 - darkness * 0.3);
      const df = 1 - darkness * 0.45;
      const x = nx * this.#width;

      // Subtle ground shadow
      const shadowX = x + 5 * this.#scale;
      const shadowY = baseY + h * 0.05;
      ctx.fillStyle = `rgba(0,0,0,${0.1 * df})`;
      ctx.beginPath();
      ctx.ellipse(shadowX, shadowY, w * 0.6, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, baseY);

      if (type === 0 || type === 2) {
        const trunkW = Math.max(3, w * 0.12);
        const trunkH = h * 0.35;
        ctx.fillStyle = `rgba(55,42,32,${opacity * df})`;
        ctx.fillRect(-trunkW / 2, -trunkH, trunkW, trunkH);

        const crownY = -h * 0.55;
        const crownR = w * 0.45;

        ctx.fillStyle = `rgba(38,78,32,${opacity * df})`;
        ctx.beginPath();
        ctx.arc(0, crownY + crownR * 0.1, crownR, 0, Math.PI, false);
        ctx.fill();

        ctx.fillStyle = `rgba(52,98,42,${opacity * df})`;
        ctx.beginPath();
        ctx.arc(0, crownY - crownR * 0.05, crownR, Math.PI, 0, false);
        ctx.fill();

        for (let j = 0; j < 5; j++) {
          const ang = (j / 5) * Math.PI * 2;
          const pr = crownR * (0.55 + Math.sin(j * 2.3) * 0.2);
          const pdx = Math.cos(ang) * crownR * 0.25;
          const pdy = Math.sin(ang) * crownR * 0.18 + crownY;
          const isBottom = pdy > crownY;
          ctx.fillStyle = isBottom
            ? `rgba(42,88,36,${opacity * df * 0.9})`
            : `rgba(58,108,48,${opacity * df * 0.9})`;
          ctx.beginPath();
          ctx.arc(pdx, pdy, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (type === 1) {
        const trunkW = Math.max(3, w * 0.1);
        ctx.fillStyle = `rgba(55,42,32,${opacity * df})`;
        ctx.fillRect(-trunkW / 2, -h * 0.2, trunkW, h * 0.2);

        for (let j = 0; j < 4; j++) {
          const t = j / 3;
          const layerY = -h * (0.25 + t * 0.65);
          const layerW = w * (0.85 - t * 0.45);
          const layerH = h * 0.28;

          ctx.fillStyle = `rgba(48,92,40,${opacity * df})`;
          ctx.beginPath();
          ctx.moveTo(0, layerY - layerH * 0.6);
          ctx.lineTo(-layerW * 0.35, layerY + layerH * 0.4);
          ctx.lineTo(0, layerY + layerH * 0.2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = `rgba(32,62,28,${opacity * df})`;
          ctx.beginPath();
          ctx.moveTo(0, layerY - layerH * 0.6);
          ctx.lineTo(0, layerY + layerH * 0.2);
          ctx.lineTo(layerW * 0.35, layerY + layerH * 0.4);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        const trunkW = Math.max(3, w * 0.1);
        ctx.fillStyle = `rgba(55,42,32,${opacity * df})`;
        ctx.fillRect(-trunkW / 2, -h * 0.32, trunkW, h * 0.32);

        for (let j = 0; j < 3; j++) {
          const ang = (j / 3) * Math.PI + 0.5;
          const cr = w * 0.32;
          const cx = Math.cos(ang) * w * 0.15;
          const cy = -h * 0.55 + Math.sin(ang) * h * 0.1;
          const isBottom = cy > -h * 0.5;
          ctx.fillStyle = isBottom
            ? `rgba(40,80,34,${opacity * df})`
            : `rgba(52,100,44,${opacity * df})`;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  // Grasses: drawn once, blended at base of trees
  #drawGrassesTo(ctx: CanvasRenderingContext2D, darkness: number) {
    const count = Math.max(20, Math.floor(this.#width / 40));
    const baseY = this.#height;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.#width;
      const h = this.#height * Utils.randomRange(0.025, 0.055);
      const lit = Utils.randomRange(38, 52) * (1 - darkness * 0.3);
      ctx.strokeStyle = `hsl(${Utils.randomRange(85, 120)}, ${Utils.randomRange(40, 55)}%, ${lit}%)`;
      ctx.lineWidth = Utils.randomRange(1.0, 1.8);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + 1, baseY - h * 0.5, x, baseY - h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ===================== DYNAMIC ELEMENTS (per frame) =====================

  #drawSky() {
    const ctx = this.#ctx;
    const p = this.#dayProgress;
    const grad = ctx.createLinearGradient(0, 0, 0, this.#height);

    const stops: [number, string][] = [];
    if (p < 0.2) {
      const t = p / 0.2;
      stops.push([0, ColorUtils.lerpColor('#0a1525', '#607090', t)]);
      stops.push([0.35, ColorUtils.lerpColor('#152035', '#d89060', t)]);
      stops.push([0.6, ColorUtils.lerpColor('#202830', '#f0a070', t)]);
      stops.push([1, ColorUtils.lerpColor('#252830', '#80a080', t)]);
    } else if (p < 0.4) {
      const t = (p - 0.2) / 0.2;
      stops.push([0, ColorUtils.lerpColor('#607090', '#87ceeb', t)]);
      stops.push([0.35, ColorUtils.lerpColor('#d89060', '#a8d8f0', t)]);
      stops.push([0.6, ColorUtils.lerpColor('#f0a070', '#b8e0d8', t)]);
      stops.push([1, ColorUtils.lerpColor('#80a080', '#c0dcc0', t)]);
    } else if (p < 0.6) {
      stops.push([0, '#87ceeb']);
      stops.push([0.4, '#a8d8f0']);
      stops.push([1, '#c0dcc0']);
    } else if (p < 0.8) {
      const t = (p - 0.6) / 0.2;
      stops.push([0, ColorUtils.lerpColor('#87ceeb', '#4a5080', t)]);
      stops.push([0.25, ColorUtils.lerpColor('#a8d8f0', '#906070', t)]);
      stops.push([0.5, ColorUtils.lerpColor('#b0dce0', '#d07050', t)]);
      stops.push([0.7, ColorUtils.lerpColor('#c0dcc0', '#b04530', t)]);
      stops.push([1, ColorUtils.lerpColor('#b0d0b0', '#504040', t)]);
    } else {
      const t = (p - 0.8) / 0.2;
      stops.push([0, ColorUtils.lerpColor('#4a5080', '#0a1525', t)]);
      stops.push([0.35, ColorUtils.lerpColor('#906070', '#152035', t)]);
      stops.push([0.6, ColorUtils.lerpColor('#d07050', '#202830', t)]);
      stops.push([1, ColorUtils.lerpColor('#504040', '#252830', t)]);
    }
    stops.forEach((s) => grad.addColorStop(s[0], s[1]));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.#width, this.#height);
  }

  #drawStars() {
    const darkness = this.getDarkness();
    if (darkness < 0.3) return;
    const ctx = this.#ctx;
    const alpha = Math.min(1, (darkness - 0.3) / 0.35);
    for (const star of this.#stars) {
      const tw = Math.sin(this.#time * star.twinkleSpeed + star.twinklePhase);
      const br = star.brightTwinkle ? 0.2 + (tw * 0.5 + 0.5) * 0.8 : 0.4 + tw * 0.6;
      const sz = star.size * (star.brightTwinkle ? 1 + tw * 0.4 : 1);
      ctx.fillStyle = `rgba(255,255,245,${alpha * br * 0.9})`;
      ctx.beginPath();
      ctx.arc(star.x * this.#width, star.y * this.#height, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #drawShootingStar() {
    if (!this.#shootingStar) return;
    const ctx = this.#ctx;
    const s = this.#shootingStar;
    const alpha = s.life * 0.9;
    const tailLen = 18 * this.#scale;

    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 5 * this.#scale);
    grad.addColorStop(0, `rgba(255,255,240,${alpha})`);
    grad.addColorStop(1, `rgba(255,255,240,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5 * this.#scale, 0, Math.PI * 2);
    ctx.fill();

    const angle = Math.atan2(s.vy, s.vx);
    ctx.strokeStyle = `rgba(255,255,235,${alpha * 0.6})`;
    ctx.lineWidth = 1.5 * this.#scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - Math.cos(angle) * tailLen, s.y - Math.sin(angle) * tailLen);
    ctx.stroke();
  }

  #drawSunMoon() {
    const ctx = this.#ctx;
    const darkness = this.getDarkness();
    const sunAlt = this.getSunAltitude();
    const horizonY = this.#height * 0.55;
    const sunY = horizonY - sunAlt * this.#height * 0.45;
    const sunX = this.#width * 0.5 + Math.cos(this.#dayProgress * Math.PI * 2) * this.#width * 0.35;

    if (sunAlt > -0.1) {
      const radius = 25 * this.#scale + 5;
      const alpha = Math.min(1, (sunAlt + 0.1) / 0.3);
      let coreColor: string, glowColor: string;
      if (sunAlt < 0.2) {
        coreColor = '#ffb060';
        glowColor = '#ff7030';
      } else if (sunAlt < 0.6) {
        coreColor = ColorUtils.lerpColor('#ffb060', '#fffff0', (sunAlt - 0.2) / 0.4);
        glowColor = ColorUtils.lerpColor('#ff7030', '#fff8c0', (sunAlt - 0.2) / 0.4);
      } else {
        coreColor = '#fffff0';
        glowColor = '#fff8c0';
      }
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius * 3.5);
      glow.addColorStop(0, ColorUtils.hexToRgba(glowColor, 0.4 * alpha));
      glow.addColorStop(0.5, ColorUtils.hexToRgba(glowColor, 0.1 * alpha));
      glow.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius * 3.5, 0, Math.PI * 2);
      ctx.fill();
      const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius);
      core.addColorStop(0, coreColor);
      core.addColorStop(0.85, glowColor);
      core.addColorStop(1, ColorUtils.hexToRgba(glowColor, 0.6 * alpha));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const moonAlt = -sunAlt;
    const moonY = horizonY - moonAlt * this.#height * 0.4;
    const moonX = this.#width * 0.5 - Math.cos(this.#dayProgress * Math.PI * 2) * this.#width * 0.3;
    if (moonAlt > -0.1 && darkness > 0.35) {
      const mr = 18 * this.#scale + 4;
      const ma = Math.min(1, (moonAlt + 0.1) / 0.3) * Math.min(1, (darkness - 0.35) / 0.3);
      const mg = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, mr * 2.5);
      mg.addColorStop(0, `rgba(200,210,230,${0.25 * ma})`);
      mg.addColorStop(1, 'rgba(200,210,230,0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(moonX, moonY, mr * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(235,240,250,${ma})`;
      ctx.beginPath();
      ctx.arc(moonX, moonY, mr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #drawGodRays() {
    const darkness = this.getDarkness();
    const sunAlt = this.getSunAltitude();
    if (sunAlt < 0.05 || darkness > 0.5) return;

    const ctx = this.#ctx;
    const horizonY = this.#height * 0.55;
    const sunY = horizonY - sunAlt * this.#height * 0.45;
    const sunX = this.#width * 0.5 + Math.cos(this.#dayProgress * Math.PI * 2) * this.#width * 0.35;
    const alpha = 0.035 * (1 - darkness * 0.6);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rayCount = 5;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 0.6 + Math.PI * 0.7 + Math.sin(this.#time * 0.2 + i) * 0.08;
      const len = this.#height * 0.9;
      ctx.fillStyle = `rgba(255,248,220,${alpha * (0.6 + Math.sin(i * 1.7) * 0.4)})`;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX + Math.cos(angle - 0.02) * len, sunY + Math.sin(angle - 0.02) * len);
      ctx.lineTo(sunX + Math.cos(angle + 0.02) * len, sunY + Math.sin(angle + 0.02) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Clouds: more puffs, lower per-puff opacity, blend with each other
  #drawClouds() {
    const ctx = this.#ctx;
    const darkness = this.getDarkness();
    const cb = 1 - darkness * 0.6;

    for (const cloud of this.#clouds) {
      const bx = cloud.x * this.#width;
      const by = cloud.y * this.#height;
      const weatherDark = cloud.darkening;

      // Draw a soft halo for the entire cloud first (cheap, blends puffs)
      const haloR = cloud.puffs.reduce((max, p) => Math.max(max, p.r), 0) * this.#width * 1.3;
      const haloX = bx;
      const haloY = by;
      const haloGrad = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, haloR);
      const haloAlpha = cloud.opacity * 0.35 * cb;
      haloGrad.addColorStop(0, `rgba(255,255,250,${haloAlpha})`);
      haloGrad.addColorStop(0.6, `rgba(240,240,245,${haloAlpha * 0.4})`);
      haloGrad.addColorStop(1, 'rgba(220,220,225,0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.ellipse(haloX, haloY, haloR, haloR * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Then individual puffs with reduced opacity (blend with halo)
      for (const puff of cloud.puffs) {
        const px = bx + puff.ox * this.#width;
        const py = by + puff.oy * this.#height;
        const rx = puff.r * this.#width;
        const ry = puff.r * this.#width * 0.55;

        const grad = ctx.createRadialGradient(
          px - rx * 0.15,
          py - ry * 0.25,
          0,
          px,
          py,
          Math.max(rx, ry)
        );
        const baseBright = 255 * cb * (1 - weatherDark * 0.35);
        const edgeDark = 220 * cb * (1 - weatherDark * 0.5);
        const shadowR = 180 * cb * (1 - weatherDark * 0.5);
        // Lower per-puff opacity since we have a halo behind
        grad.addColorStop(0, `rgba(${baseBright},${baseBright},${baseBright + 5},${cloud.opacity * 0.55})`);
        grad.addColorStop(0.55, `rgba(${edgeDark},${edgeDark},${edgeDark + 5},${cloud.opacity * 0.5})`);
        grad.addColorStop(0.9, `rgba(${shadowR},${shadowR},${shadowR + 5},${cloud.opacity * 0.25})`);
        grad.addColorStop(1, 'rgba(180,180,190,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  #drawFireflies() {
    const darkness = this.getDarkness();
    if (darkness < 0.45) return;
    const ctx = this.#ctx;
    const alpha = Math.min(1, (darkness - 0.45) / 0.35);
    for (const ff of this.#fireflies) {
      const glow = Math.sin(ff.glowPhase) * 0.5 + 0.5;
      const x = ff.nx * this.#width + this.#offsetX * 0.08 * 25;
      const y = ff.ny * this.#height;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 7);
      grad.addColorStop(0, `rgba(255,255,140,${alpha * glow * 0.75})`);
      grad.addColorStop(0.6, `rgba(180,255,90,${alpha * glow * 0.25})`);
      grad.addColorStop(1, 'rgba(180,255,90,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,180,${alpha * glow})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #drawVolumetricLight(flowerX?: number, flowerY?: number) {
    const darkness = this.getDarkness();
    const alpha = 0.055 * (1 - darkness * 0.7);
    if (alpha < 0.008) return;
    const x = flowerX ?? this.#width * 0.5;
    const y = (flowerY ?? this.#height * 0.5) - this.#height * 0.08;
    const radius = Math.min(this.#width, this.#height) * 0.5;
    const grad = this.#ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(255,252,235,${alpha})`);
    grad.addColorStop(0.45, `rgba(255,248,215,${alpha * 0.45})`);
    grad.addColorStop(1, 'rgba(255,248,215,0)');
    this.#ctx.fillStyle = grad;
    this.#ctx.fillRect(0, 0, this.#width, this.#height);
  }
}
