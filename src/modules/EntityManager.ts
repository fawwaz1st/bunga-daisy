import { Utils } from '../config.js';
import { ButterflySystem } from './ButterflySystem.js';

/* ================================================================
   Shared steering helpers
   ================================================================ */

interface PhysicsEntity {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;
  maxSpeed: number;
  maxForce: number;
}

function applyForce(e: PhysicsEntity, fx: number, fy: number) {
  const mag = Math.hypot(fx, fy);
  if (mag > e.maxForce && mag > 0) {
    const s = e.maxForce / mag;
    fx *= s;
    fy *= s;
  }
  e.ax += fx;
  e.ay += fy;
}

function updatePhysics(e: PhysicsEntity, dt: number) {
  e.vx += e.ax * dt;
  e.vy += e.ay * dt;
  const speed = Math.hypot(e.vx, e.vy);
  if (speed > e.maxSpeed) {
    const scale = e.maxSpeed / speed;
    e.vx *= scale;
    e.vy *= scale;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.ax = 0;
  e.ay = 0;
}

function seek(e: PhysicsEntity, tx: number, ty: number) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const desiredX = (dx / d) * e.maxSpeed;
  const desiredY = (dy / d) * e.maxSpeed;
  return { x: desiredX - e.vx, y: desiredY - e.vy };
}

function separate(e: PhysicsEntity, others: PhysicsEntity[], desiredSep: number) {
  let sx = 0, sy = 0, count = 0;
  for (const o of others) {
    if (o === e) continue;
    const d = Utils.distance(e.x, e.y, o.x, o.y);
    if (d < desiredSep && d > 0) {
      sx += (e.x - o.x) / d;
      sy += (e.y - o.y) / d;
      count++;
    }
  }
  if (count === 0) return { x: 0, y: 0 };
  return { x: sx, y: sy };
}

/* ================================================================
   Entity interfaces
   ================================================================ */

interface Ant extends PhysicsEntity { phase: number; side: number; }

interface Moth extends PhysicsEntity {
  size: number;
  alpha: number;
  state: 'enter' | 'orbit';
  targetRadius: number;
  timer: number;
}

interface SpiderThread {
  angle: number;
  len: number;
  maxLen: number;
  growSpeed: number;
}

interface Spider {
  x: number; y: number;
  targetY: number;
  state: 'building' | 'hanging' | 'leaving';
  threads: SpiderThread[];
  bodyY: number;
  bodyX: number;
  timer: number;
  legPhase: number;
}

interface Ladybug extends PhysicsEntity {
  state: 'walk' | 'pause' | 'fly';
  timer: number;
  stemT: number;
  dir: number;
  flyTargetX: number;
  flyTargetY: number;
}

interface WormSegment { x: number; y: number; }

interface Worm extends PhysicsEntity {
  segments: WormSegment[];
  state: 'hidden' | 'emerge' | 'wiggle' | 'retreat';
  timer: number;
  groundY: number;
  targetY: number;
  wiggleOffset: number;
}

interface Dragonfly extends PhysicsEntity {
  state: 'cruise' | 'turn' | 'hover';
  timer: number;
  targetX: number;
  targetY: number;
  wingPhase: number;
}

/* ================================================================
   EntityManager
   ================================================================ */

export class EntityManager {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;
  #butterflies: ButterflySystem;
  #flowerX = 0;
  #flowerY = 0;
  #time = 0;

  #ants: Ant[] = [];
  #moths: Moth[] = [];
  #spider: Spider | null = null;
  #spiderTimer = 0;
  #ladybugs: Ladybug[] = [];
  #worms: Worm[] = [];
  #dragonflies: Dragonfly[] = [];
  #rainTimer = 0;
  #rainActive = false;
  #rainDuration = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.#ctx = ctx;
    this.#width = width;
    this.#height = height;
    this.#butterflies = new ButterflySystem(ctx, width, height);
    this.#initAnts();
    this.#initMoths();
    this.#initLadybugs();
    this.#initWorms();
    this.#initDragonflies();
    this.#rainTimer = Utils.randomRange(5000, 15000);
  }

  #initAnts() {
    const groundY = this.#height * 0.95;
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.#ants.push({
        x: side === -1 ? Utils.randomRange(-40, 20) : Utils.randomRange(this.#width - 20, this.#width + 40),
        y: groundY + Utils.randomRange(-3, 3),
        vx: 0, vy: 0, ax: 0, ay: 0,
        maxSpeed: Utils.randomRange(0.35, 0.75),
        maxForce: Utils.randomRange(0.03, 0.07),
        phase: Math.random() * Math.PI * 2,
        side,
      });
    }
  }

  #initMoths() {
    for (let i = 0; i < 3; i++) {
      this.#moths.push({
        x: Utils.randomRange(0, this.#width),
        y: Utils.randomRange(-80, -20),
        vx: 0, vy: 0, ax: 0, ay: 0,
        maxSpeed: Utils.randomRange(0.7, 1.3),
        maxForce: Utils.randomRange(0.02, 0.05),
        size: Utils.randomRange(4, 7),
        alpha: 0,
        state: 'enter',
        targetRadius: Utils.randomRange(50, 130),
        timer: 0,
      });
    }
  }

  #initLadybugs() {
    for (let i = 0; i < 3; i++) {
      this.#ladybugs.push({
        x: 0, y: 0,
        vx: 0, vy: 0, ax: 0, ay: 0,
        maxSpeed: Utils.randomRange(0.25, 0.55),
        maxForce: 0.05,
        state: 'walk',
        timer: Utils.randomRange(0, 2000),
        stemT: Utils.randomRange(0.1, 0.9),
        dir: Math.random() < 0.5 ? 1 : -1,
        flyTargetX: 0, flyTargetY: 0,
      });
    }
  }

  #initWorms() {
    const groundY = this.#height * 0.96;
    for (let i = 0; i < 2; i++) {
      const x = Utils.randomRange(this.#width * 0.2, this.#width * 0.8);
      this.#worms.push({
        x, y: groundY,
        segments: Array.from({ length: 7 }, () => ({ x, y: groundY })),
        vx: 0, vy: 0, ax: 0, ay: 0,
        maxSpeed: 0.15,
        maxForce: 0.02,
        state: 'hidden',
        timer: Utils.randomRange(2000, 8000),
        groundY,
        targetY: groundY - Utils.randomRange(15, 45),
        wiggleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  #initDragonflies() {
    for (let i = 0; i < 1; i++) {
      this.#dragonflies.push({
        x: Utils.randomRange(0, this.#width),
        y: Utils.randomRange(0, this.#height * 0.35),
        vx: Utils.randomRange(-2, 2),
        vy: Utils.randomRange(-2, 2),
        ax: 0, ay: 0,
        maxSpeed: Utils.randomRange(3.5, 5.5),
        maxForce: Utils.randomRange(0.1, 0.25),
        state: 'cruise',
        timer: Utils.randomRange(2000, 5000),
        targetX: Utils.randomRange(0, this.#width),
        targetY: Utils.randomRange(0, this.#height * 0.5),
        wingPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#butterflies.resize(width, height);
  }

  updateFlowerPosition(x: number, y: number) {
    this.#flowerX = x;
    this.#flowerY = y;
    this.#butterflies.updateFlowerPosition(x, y);
  }

  /** Forward a scare event to butterflies so they flee from clicks. */
  scare(x: number, y: number) {
    this.#butterflies.scare(x, y);
  }

  update(deltaTime: number, isNight: boolean) {
    this.#time += deltaTime;
    const dt = deltaTime * 0.06;
    this.#butterflies.update(deltaTime);

    // Simulated rain events for worms
    this.#rainTimer -= deltaTime;
    if (this.#rainTimer <= 0) {
      this.#rainTimer = Utils.randomRange(20000, 40000);
      this.#rainActive = true;
      this.#rainDuration = Utils.randomRange(8000, 12000);
    }
    if (this.#rainActive) {
      this.#rainDuration -= deltaTime;
      if (this.#rainDuration <= 0) this.#rainActive = false;
    }

    this.#updateAnts(dt);
    this.#updateMoths(deltaTime, dt, isNight);
    this.#updateSpider(deltaTime, isNight);
    this.#updateLadybugs(deltaTime, dt);
    this.#updateWorms(deltaTime, dt);
    this.#updateDragonflies(deltaTime, dt);
  }

  /* ------------------------------------------------------------ */

  #stemBaseY() {
    return this.#flowerY + Math.min(this.#height * 0.4, 300);
  }

  #stemPos(t: number) {
    const baseY = this.#stemBaseY();
    const sway = Math.sin(this.#time * 0.001) * 6 * t;
    return {
      x: this.#flowerX + sway,
      y: baseY + (this.#flowerY - baseY) * t,
    };
  }

  /* ------------------------------------------------------------ */

  #updateAnts(dt: number) {
    const baseY = this.#stemBaseY();
    const baseX = this.#flowerX;
    const groundY = this.#height * 0.95;

    for (const a of this.#ants) {
      const noiseX = Math.sin(this.#time * 0.001 + a.phase) * 25;
      const noiseY = Math.cos(this.#time * 0.001 + a.phase) * 12;
      let tx = baseX + noiseX;
      let ty = baseY + noiseY;

      const dToFlower = Utils.distance(a.x, a.y, baseX, baseY);
      if (dToFlower < 30) {
        tx = baseX + Math.sin(this.#time * 0.002 + a.phase) * 50;
        ty = baseY + Math.cos(this.#time * 0.002 + a.phase) * 15;
      }

      const s = seek(a, tx, ty);
      const sep = separate(a, this.#ants, 10);
      applyForce(a, s.x + sep.x * 1.8, s.y + sep.y * 1.8);
      updatePhysics(a, dt);

      if (a.y > groundY + 8) { a.y = groundY + 8; a.vy *= -0.3; }
      if (a.y < groundY - 60) { a.y = groundY - 60; a.vy *= -0.3; }
      if (a.x < -40) a.x = this.#width + 40;
      if (a.x > this.#width + 40) a.x = -40;
    }
  }

  #updateMoths(deltaTime: number, dt: number, isNight: boolean) {
    for (const m of this.#moths) {
      if (!isNight) {
        m.alpha = Utils.lerp(m.alpha, 0, 0.03);
        m.state = 'enter';
        applyForce(m, 0, -0.03);
        updatePhysics(m, dt);
        continue;
      }

      if (m.state === 'enter') {
        m.alpha = Utils.lerp(m.alpha, 0.75, 0.02);
        const s = seek(m, this.#flowerX, this.#flowerY);
        applyForce(m, s.x, s.y);
        if (Utils.distance(m.x, m.y, this.#flowerX, this.#flowerY) < m.targetRadius + 15) {
          m.state = 'orbit';
          m.timer = Utils.randomRange(4000, 10000);
        }
      } else if (m.state === 'orbit') {
        m.alpha = Utils.lerp(m.alpha, 0.65, 0.02);
        const dx = m.x - this.#flowerX;
        const dy = m.y - this.#flowerY;
        const dist = Math.hypot(dx, dy) || 1;
        const ringForce = (dist - m.targetRadius) * 0.035;
        const toRingX = (dx / dist) * ringForce;
        const toRingY = (dy / dist) * ringForce;
        const tanX = -(dy / dist) * m.maxSpeed;
        const tanY = (dx / dist) * m.maxSpeed;
        const steerX = tanX - m.vx - toRingX;
        const steerY = tanY - m.vy - toRingY;
        applyForce(m, steerX, steerY);
        m.timer -= deltaTime;
        if (m.timer <= 0) {
          m.state = 'enter';
          m.targetRadius = Utils.randomRange(50, 130);
        }
      }

      updatePhysics(m, dt);
      if (m.x < -60) m.x = this.#width + 60;
      if (m.x > this.#width + 60) m.x = -60;
      if (m.y < -60) m.y = this.#height + 60;
      if (m.y > this.#height + 60) m.y = -60;
    }
  }

  #updateSpider(deltaTime: number, isNight: boolean) {
    if (!isNight && this.#spider) {
      this.#spider.state = 'leaving';
    }
    if (isNight && !this.#spider && Math.random() < 0.0004) {
      const startX = Utils.randomRange(this.#width * 0.3, this.#width * 0.7);
      this.#spider = {
        x: startX, y: -10,
        targetY: this.#flowerY - 30,
        state: 'building',
        threads: Array.from({ length: 5 }, (_, i) => ({
          angle: (i / 5) * Math.PI + Utils.randomRange(-0.3, 0.3),
          len: 0,
          maxLen: Utils.randomRange(35, 80),
          growSpeed: Utils.randomRange(0.2, 0.6),
        })),
        bodyY: -10,
        bodyX: startX,
        timer: 0,
        legPhase: Math.random() * Math.PI * 2,
      };
      this.#spiderTimer = 0;
    }
    if (!this.#spider) return;
    this.#spiderTimer += deltaTime;
    const s = this.#spider;
    s.legPhase += deltaTime * 0.006;
    const dt = deltaTime * 0.06;

    if (s.state === 'building') {
      let grown = 0;
      for (const t of s.threads) {
        t.len = Math.min(t.maxLen, t.len + t.growSpeed * dt);
        if (t.len >= t.maxLen) grown++;
      }
      s.bodyY += (s.targetY - s.bodyY) * 0.04 * dt;
      s.bodyX = s.x + Math.sin(this.#time * 0.001) * 2;
      if (grown >= s.threads.length && Math.abs(s.bodyY - s.targetY) < 5) {
        s.state = 'hanging';
        s.timer = Utils.randomRange(5000, 10000);
      }
    } else if (s.state === 'hanging') {
      s.bodyY = s.targetY + Math.sin(this.#time * 0.002) * 3;
      s.bodyX = s.x + Math.sin(this.#time * 0.0015) * 2;
      s.timer -= deltaTime;
      if (s.timer <= 0) s.state = 'leaving';
    } else if (s.state === 'leaving') {
      s.bodyY += (-20 - s.bodyY) * 0.05 * dt;
      if (s.bodyY < -15) {
        this.#spider = null;
        this.#spiderTimer = 0;
      }
    }
  }

  #updateLadybugs(deltaTime: number, dt: number) {
    for (const l of this.#ladybugs) {
      l.timer -= deltaTime;
      const pos = this.#stemPos(l.stemT);

      if (l.state === 'walk') {
        const nextT = l.stemT + l.dir * 0.0008 * deltaTime;
        const nextPos = this.#stemPos(Utils.clamp(nextT, 0, 1));
        const s = seek(l, nextPos.x, nextPos.y);
        applyForce(l, s.x, s.y);
        l.stemT = nextT;
        if (l.stemT <= 0 || l.stemT >= 1) {
          l.dir *= -1;
          l.stemT = Utils.clamp(l.stemT, 0, 1);
          if (Math.random() < 0.3) {
            l.state = 'pause';
            l.timer = Utils.randomRange(1000, 3000);
          }
        }
        if (Math.random() < 0.002) {
          l.state = 'fly';
          l.timer = Utils.randomRange(2000, 4000);
          l.flyTargetX = this.#flowerX + Utils.randomRange(-80, 80);
          l.flyTargetY = this.#flowerY + Utils.randomRange(-60, 40);
        }
      } else if (l.state === 'pause') {
        l.vx *= 0.8;
        l.vy *= 0.8;
        if (l.timer <= 0) {
          l.state = 'walk';
          l.dir = Math.random() < 0.5 ? 1 : -1;
        }
      } else if (l.state === 'fly') {
        const s = seek(l, l.flyTargetX, l.flyTargetY);
        applyForce(l, s.x, s.y);
        const d = Utils.distance(l.x, l.y, l.flyTargetX, l.flyTargetY);
        if (d < 10 || l.timer <= 0) {
          l.state = 'walk';
          l.stemT = Utils.clamp(l.stemT, 0, 1);
          l.timer = Utils.randomRange(500, 1500);
        }
      }
      updatePhysics(l, dt);
      if (l.state === 'walk') {
        const ideal = this.#stemPos(Utils.clamp(l.stemT, 0, 1));
        l.x += (ideal.x - l.x) * 0.1;
        l.y += (ideal.y - l.y) * 0.1;
      }
    }
  }

  #updateWorms(deltaTime: number, dt: number) {
    for (const w of this.#worms) {
      w.timer -= deltaTime;
      switch (w.state) {
        case 'hidden': {
          if (w.timer <= 0 && this.#rainActive) {
            w.state = 'emerge';
            w.timer = Utils.randomRange(3000, 6000);
            w.targetY = w.groundY - Utils.randomRange(20, 50);
          }
          break;
        }
        case 'emerge': {
          const s = seek(w, w.x, w.targetY);
          applyForce(w, s.x, s.y);
          if (Math.abs(w.y - w.targetY) < 3 || w.timer <= 0) {
            w.state = 'wiggle';
            w.timer = Utils.randomRange(4000, 8000);
          }
          break;
        }
        case 'wiggle': {
          w.wiggleOffset += deltaTime * 0.004;
          w.vx += Math.cos(w.wiggleOffset) * 0.01;
          w.x += Math.sin(w.wiggleOffset) * 0.3;
          if (w.timer <= 0) {
            w.state = 'retreat';
            w.timer = Utils.randomRange(2000, 4000);
          }
          break;
        }
        case 'retreat': {
          const s = seek(w, w.x, w.groundY);
          applyForce(w, s.x, s.y);
          if (Math.abs(w.y - w.groundY) < 3 || w.timer <= 0) {
            w.state = 'hidden';
            w.timer = Utils.randomRange(8000, 20000);
          }
          break;
        }
      }
      updatePhysics(w, dt);
      w.segments[0] = { x: w.x, y: w.y };
      for (let i = 1; i < w.segments.length; i++) {
        const prev = w.segments[i - 1];
        const seg = w.segments[i];
        const dx = prev.x - seg.x;
        const dy = prev.y - seg.y;
        const d = Math.hypot(dx, dy) || 1;
        const spacing = 5;
        if (d > spacing) {
          seg.x += (dx / d) * (d - spacing) * 0.5;
          seg.y += (dy / d) * (d - spacing) * 0.5;
        }
      }
      if (w.y > w.groundY) w.y = w.groundY;
    }
  }

  #updateDragonflies(deltaTime: number, dt: number) {
    for (const d of this.#dragonflies) {
      d.wingPhase += deltaTime * 0.015;
      d.timer -= deltaTime;
      if (d.state === 'cruise') {
        const s = seek(d, d.targetX, d.targetY);
        applyForce(d, s.x, s.y);
        const dist = Utils.distance(d.x, d.y, d.targetX, d.targetY);
        if (dist < 20 || d.timer <= 0) {
          d.state = 'turn';
          d.timer = Utils.randomRange(500, 1200);
          d.targetX = Utils.randomRange(0, this.#width);
          d.targetY = Utils.randomRange(0, this.#height * 0.45);
        }
      } else if (d.state === 'turn') {
        const s = seek(d, d.targetX, d.targetY);
        applyForce(d, s.x * 3, s.y * 3);
        if (d.timer <= 0) {
          d.state = Math.random() < 0.3 ? 'hover' : 'cruise';
          d.timer = Utils.randomRange(2000, 5000);
        }
      } else if (d.state === 'hover') {
        d.vx *= 0.92;
        d.vy *= 0.92;
        d.x += Math.sin(this.#time * 0.002 + d.wingPhase) * 0.2;
        d.y += Math.cos(this.#time * 0.003 + d.wingPhase) * 0.15;
        if (d.timer <= 0) {
          d.state = 'cruise';
          d.timer = Utils.randomRange(2000, 5000);
          d.targetX = Utils.randomRange(0, this.#width);
          d.targetY = Utils.randomRange(0, this.#height * 0.45);
        }
      }
      updatePhysics(d, dt);
      if (d.x < -40) { d.x = -40; d.vx *= -1; }
      if (d.x > this.#width + 40) { d.x = this.#width + 40; d.vx *= -1; }
      if (d.y < -40) { d.y = -40; d.vy *= -1; }
      if (d.y > this.#height * 0.6) { d.y = this.#height * 0.6; d.vy *= -1; }
    }
  }

  /* ================================================================
     Drawing
     ================================================================ */

  draw(isNight: boolean) {
    const ctx = this.#ctx;
    this.#drawSpider(ctx);
    this.#drawAnts(ctx);
    this.#drawWorms(ctx);
    this.#drawLadybugs(ctx);
    this.#drawMoths(ctx, isNight);
    this.#butterflies.draw();
    this.#drawDragonflies(ctx);
  }

  #drawAnts(ctx: CanvasRenderingContext2D) {
    for (const a of this.#ants) {
      const angle = Math.atan2(a.vy, a.vx) || 0;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#3e2b1f';
      ctx.beginPath(); ctx.ellipse(-2, 0, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(1, 0, 1.5, 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,45,30,0.6)';
      ctx.lineWidth = 0.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-1 + i * 2, (i % 2 === 0 ? 1 : -1) * 2.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  #drawMoths(ctx: CanvasRenderingContext2D, isNight: boolean) {
    if (!isNight) return;
    for (const m of this.#moths) {
      if (m.alpha < 0.01) continue;
      ctx.save();
      ctx.translate(m.x, m.y);
      const angle = Math.atan2(m.vy, m.vx) + Math.PI / 2;
      ctx.rotate(angle);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, m.size * 5);
      glow.addColorStop(0, `rgba(255, 240, 200, ${m.alpha * 0.3})`);
      glow.addColorStop(1, `rgba(255, 240, 200, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, 0, m.size * 5, 0, Math.PI * 2); ctx.fill();
      const wing = Math.sin(this.#time * 0.01 + m.x) * 0.5;
      ctx.fillStyle = `rgba(230, 220, 190, ${m.alpha})`;
      ctx.strokeStyle = `rgba(200, 190, 160, ${m.alpha * 0.6})`;
      ctx.lineWidth = 0.6;
      for (const side of [1, -1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(wing * side);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(m.size * 0.4, -m.size * 0.3, m.size * 1.2, -m.size * 0.6, m.size * 0.8, -m.size * 1.4);
        ctx.bezierCurveTo(m.size * 0.3, -m.size * 1.6, m.size * 0.1, -m.size * 1.2, 0, -m.size * 0.8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = `rgba(180, 170, 140, ${m.alpha})`;
      ctx.beginPath(); ctx.ellipse(0, 0, m.size * 0.15, m.size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  #drawSpider(ctx: CanvasRenderingContext2D) {
    if (!this.#spider) return;
    const s = this.#spider;
    ctx.strokeStyle = 'rgba(210, 210, 220, 0.25)';
    ctx.lineWidth = 0.6;
    for (const t of s.threads) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(t.angle) * t.len, s.y + Math.sin(t.angle) * t.len);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.bodyX, s.bodyY);
    ctx.stroke();

    ctx.save();
    ctx.translate(s.bodyX, s.bodyY);
    ctx.strokeStyle = 'rgba(40,40,40,0.9)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.sin(s.legPhase + i) * 0.3;
      const len = i % 2 === 0 ? 7 : 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(0, 1, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -2, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  #drawLadybugs(ctx: CanvasRenderingContext2D) {
    for (const l of this.#ladybugs) {
      ctx.save();
      ctx.translate(l.x, l.y);
      const angle = Math.atan2(l.vy, l.vx) + Math.PI / 2;
      ctx.rotate(angle);
      ctx.fillStyle = '#cc2211';
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-1.2, -1, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(1.2, -1, 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 1.5, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(0, -3.2, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  #drawWorms(ctx: CanvasRenderingContext2D) {
    for (const w of this.#worms) {
      if (w.state === 'hidden') continue;
      ctx.strokeStyle = 'rgba(160, 120, 100, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w.segments[0].x, w.segments[0].y);
      for (let i = 1; i < w.segments.length; i++) {
        const prev = w.segments[i - 1];
        const curr = w.segments[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      const last = w.segments[w.segments.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
  }

  #drawDragonflies(ctx: CanvasRenderingContext2D) {
    for (const d of this.#dragonflies) {
      const angle = Math.atan2(d.vy, d.vx) + Math.PI / 2;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(angle);
      ctx.fillStyle = '#2a3a2a';
      ctx.beginPath(); ctx.ellipse(0, 0, 1.2, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#88ccaa';
      ctx.beginPath(); ctx.arc(-0.8, -9, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0.8, -9, 1, 0, Math.PI * 2); ctx.fill();
      const wing = Math.sin(d.wingPhase) * 0.35;
      ctx.fillStyle = 'rgba(200, 230, 255, 0.35)';
      ctx.strokeStyle = 'rgba(180, 210, 240, 0.45)';
      ctx.lineWidth = 0.6;
      for (const side of [1, -1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(wing * side);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(10, -10);
        ctx.lineTo(12, 2);
        ctx.lineTo(2, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(9, 4);
        ctx.lineTo(10, 10);
        ctx.lineTo(1, 6);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
}
