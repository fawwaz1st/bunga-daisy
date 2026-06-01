import { Utils } from '../config.js';

type ButterflyType = 'monarch' | 'blue' | 'white' | 'yellow';
type ButterflyState = 'explore' | 'seek_flower' | 'perch' | 'flee' | 'swarm';

interface TrailPoint {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

interface Butterfly {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;
  maxSpeed: number;
  maxForce: number;
  size: number;
  type: ButterflyType;
  state: ButterflyState;
  stateTimer: number;
  wingPhase: number;
  wingSpeed: number;
  targetX: number; targetY: number;
  perchOffset: { x: number; y: number };
  fleeFromX: number; fleeFromY: number;
  trails: TrailPoint[];
  trailTimer: number;
  wanderTheta: number;
}

export class ButterflySystem {
  #ctx: CanvasRenderingContext2D;
  #width = 0;
  #height = 0;
  #butterflies: Butterfly[] = [];
  #flowerX = 0;
  #flowerY = 0;
  #time = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.#ctx = ctx; this.#width = width; this.#height = height;
    this.#initButterflies();
  }

  #initButterflies() {
    const types: ButterflyType[] = ['monarch', 'blue', 'white', 'yellow'];
    for (let i = 0; i < 5; i++) {
      const type = types[i % 4];
      const b: Butterfly = {
        x: Utils.randomRange(0, this.#width),
        y: Utils.randomRange(0, this.#height * 0.5),
        vx: 0, vy: 0, ax: 0, ay: 0,
        maxSpeed: Utils.randomRange(1.4, 2.4),
        maxForce: Utils.randomRange(0.06, 0.12),
        size: Utils.randomRange(6, 10),
        type,
        state: 'explore',
        stateTimer: Utils.randomRange(2000, 5000),
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: Utils.randomRange(0.005, 0.012),
        targetX: Utils.randomRange(0, this.#width),
        targetY: Utils.randomRange(0, this.#height * 0.5),
        perchOffset: { x: Utils.randomRange(-30, 30), y: Utils.randomRange(-20, 20) },
        fleeFromX: 0, fleeFromY: 0,
        trails: [],
        trailTimer: 0,
        wanderTheta: Math.random() * Math.PI * 2,
      };
      this.#butterflies.push(b);
    }
  }

  resize(width: number, height: number) { this.#width = width; this.#height = height; }
  updateFlowerPosition(x: number, y: number) { this.#flowerX = x; this.#flowerY = y; }

  /** Call this from a click handler to trigger flee behavior. */
  scare(x: number, y: number) {
    for (const b of this.#butterflies) {
      const d = Utils.distance(b.x, b.y, x, y);
      if (d < 160) {
        b.state = 'flee';
        b.stateTimer = Utils.randomRange(800, 1600);
        b.fleeFromX = x;
        b.fleeFromY = y;
        b.maxSpeed = 4.8;
        b.maxForce = 0.28;
      }
    }
  }

  update(deltaTime: number) {
    this.#time += deltaTime;
    const dt = deltaTime * 0.06;

    for (const b of this.#butterflies) {
      b.wingPhase += b.wingSpeed * deltaTime;

      switch (b.state) {
        case 'explore': {
          const wander = this.#wander(b);
          const avoid = this.#avoidEdges(b);
          const swarm = this.#swarm(b);
          this.#applyForce(b, wander.x + avoid.x + swarm.x, wander.y + avoid.y + swarm.y);
          b.stateTimer -= deltaTime;
          if (b.stateTimer <= 0) {
            const dFlower = Utils.distance(b.x, b.y, this.#flowerX, this.#flowerY);
            if (dFlower < 220 && Math.random() < 0.55) {
              b.state = 'seek_flower';
              b.targetX = this.#flowerX + Utils.randomRange(-45, 45);
              b.targetY = this.#flowerY + Utils.randomRange(-35, 15);
            } else {
              b.stateTimer = Utils.randomRange(3000, 7000);
            }
          }
          const neighbors = this.#butterflies.filter(
            o => o !== b && o.state !== 'perch' && Utils.distance(b.x, b.y, o.x, o.y) < 140
          );
          if (neighbors.length >= 2 && Math.random() < 0.004) {
            b.state = 'swarm';
            b.stateTimer = Utils.randomRange(4000, 9000);
          }
          break;
        }
        case 'seek_flower': {
          const arrive = this.#arrive(b, b.targetX, b.targetY, 35);
          const avoid = this.#avoidEdges(b);
          this.#applyForce(b, arrive.x + avoid.x, arrive.y + avoid.y);
          if (Utils.distance(b.x, b.y, b.targetX, b.targetY) < 8) {
            b.state = 'perch';
            b.stateTimer = Utils.randomRange(2000, 7000);
            b.perchOffset = { x: b.x - this.#flowerX, y: b.y - this.#flowerY };
            b.vx = 0;
            b.vy = 0;
          }
          break;
        }
        case 'perch': {
          b.x = this.#flowerX + b.perchOffset.x;
          b.y = this.#flowerY + b.perchOffset.y;
          b.vx = 0;
          b.vy = 0;
          b.ax = 0;
          b.ay = 0;
          b.stateTimer -= deltaTime;
          if (b.stateTimer <= 0) {
            b.state = 'explore';
            b.stateTimer = Utils.randomRange(3000, 7000);
            b.targetX = Utils.randomRange(0, this.#width);
            b.targetY = Utils.randomRange(0, this.#height * 0.6);
            b.vx = Utils.randomRange(-1.2, 1.2);
            b.vy = Utils.randomRange(-1.2, -0.6);
          }
          break;
        }
        case 'flee': {
          const flee = this.#flee(b, b.fleeFromX, b.fleeFromY);
          const avoid = this.#avoidEdges(b);
          this.#applyForce(b, flee.x * 2.8 + avoid.x, flee.y * 2.8 + avoid.y);
          b.stateTimer -= deltaTime;
          if (b.stateTimer <= 0) {
            b.state = 'explore';
            b.stateTimer = Utils.randomRange(2000, 6000);
            b.maxSpeed = Utils.randomRange(1.4, 2.4);
            b.maxForce = Utils.randomRange(0.06, 0.12);
          }
          break;
        }
        case 'swarm': {
          const swarm = this.#swarm(b, 1.4);
          const wander = this.#wander(b, 0.35);
          const avoid = this.#avoidEdges(b);
          const toFlower = this.#seek(b, this.#flowerX, this.#flowerY);
          this.#applyForce(
            b,
            swarm.x + wander.x * 0.5 + avoid.x + toFlower.x * 0.18,
            swarm.y + wander.y * 0.5 + avoid.y + toFlower.y * 0.18
          );
          b.stateTimer -= deltaTime;
          if (b.stateTimer <= 0) {
            b.state = 'explore';
            b.stateTimer = Utils.randomRange(3000, 7000);
          }
          break;
        }
      }

      this.#updatePhysics(b, dt);
      this.#updateTrails(b, deltaTime, dt);
      this.#wrap(b);
    }
  }

  #applyForce(b: Butterfly, fx: number, fy: number) {
    const mag = Math.hypot(fx, fy);
    if (mag > b.maxForce && mag > 0) {
      const s = b.maxForce / mag;
      fx *= s;
      fy *= s;
    }
    b.ax += fx;
    b.ay += fy;
  }

  #updatePhysics(b: Butterfly, dt: number) {
    b.vx += b.ax * dt;
    b.vy += b.ay * dt;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > b.maxSpeed) {
      const scale = b.maxSpeed / speed;
      b.vx *= scale;
      b.vy *= scale;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ax = 0;
    b.ay = 0;
  }

  #seek(b: Butterfly, tx: number, ty: number) {
    const dx = tx - b.x;
    const dy = ty - b.y;
    const d = Math.hypot(dx, dy) || 1;
    const desiredX = (dx / d) * b.maxSpeed;
    const desiredY = (dy / d) * b.maxSpeed;
    return { x: desiredX - b.vx, y: desiredY - b.vy };
  }

  #arrive(b: Butterfly, tx: number, ty: number, radius: number) {
    const dx = tx - b.x;
    const dy = ty - b.y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = d < radius ? b.maxSpeed * (d / radius) : b.maxSpeed;
    const desiredX = (dx / d) * speed;
    const desiredY = (dy / d) * speed;
    return { x: desiredX - b.vx, y: desiredY - b.vy };
  }

  #flee(b: Butterfly, tx: number, ty: number) {
    const dx = b.x - tx;
    const dy = b.y - ty;
    const d = Math.hypot(dx, dy) || 1;
    const desiredX = (dx / d) * b.maxSpeed;
    const desiredY = (dy / d) * b.maxSpeed;
    return { x: desiredX - b.vx, y: desiredY - b.vy };
  }

  #wander(b: Butterfly, weight = 1) {
    const wanderR = 25;
    const wanderD = 80;
    const change = 0.3;
    b.wanderTheta += Utils.randomRange(-change, change);
    const heading = Math.atan2(b.vy, b.vx) || 0;
    const circleCenterX = b.x + Math.cos(heading) * wanderD;
    const circleCenterY = b.y + Math.sin(heading) * wanderD;
    const displacementX = Math.cos(b.wanderTheta + heading) * wanderR;
    const displacementY = Math.sin(b.wanderTheta + heading) * wanderR;
    const targetX = circleCenterX + displacementX;
    const targetY = circleCenterY + displacementY;
    const steer = this.#seek(b, targetX, targetY);
    return { x: steer.x * weight, y: steer.y * weight };
  }

  #avoidEdges(b: Butterfly) {
    const margin = 70;
    let fx = 0, fy = 0;
    if (b.x < margin) fx += b.maxForce * 2.5;
    if (b.x > this.#width - margin) fx -= b.maxForce * 2.5;
    if (b.y < margin) fy += b.maxForce * 2.5;
    if (b.y > this.#height - margin) fy -= b.maxForce * 2.5;
    return { x: fx, y: fy };
  }

  #swarm(b: Butterfly, weight = 1) {
    const neighborDist = 130;
    let sumX = 0, sumY = 0, count = 0;
    let sepX = 0, sepY = 0;
    for (const other of this.#butterflies) {
      if (other === b) continue;
      const d = Utils.distance(b.x, b.y, other.x, other.y);
      if (d < neighborDist) {
        sumX += other.x;
        sumY += other.y;
        count++;
        if (d < 35 && d > 0) {
          sepX += (b.x - other.x) / d;
          sepY += (b.y - other.y) / d;
        }
      }
    }
    if (count === 0) return { x: 0, y: 0 };
    sumX /= count;
    sumY /= count;
    const cohesion = this.#seek(b, sumX, sumY);
    return { x: (cohesion.x + sepX * 2.2) * weight, y: (cohesion.y + sepY * 2.2) * weight };
  }

  #updateTrails(b: Butterfly, deltaTime: number, dt: number) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > b.maxSpeed * 0.55 && b.state !== 'perch') {
      b.trailTimer -= deltaTime;
      if (b.trailTimer <= 0) {
        b.trailTimer = 25;
        b.trails.push({
          x: b.x - b.vx * dt * 0.5,
          y: b.y - b.vy * dt * 0.5,
          life: 1,
          maxLife: 1,
          size: Utils.randomRange(1.2, 2.6),
        });
        if (b.trails.length > 12) b.trails.shift();
      }
    }
    for (const t of b.trails) {
      t.life -= deltaTime * 0.002;
      t.x -= b.vx * dt * 0.25;
      t.y -= b.vy * dt * 0.25;
    }
    b.trails = b.trails.filter(t => t.life > 0);
  }

  #wrap(b: Butterfly) {
    if (b.x < -50) b.x = this.#width + 50;
    if (b.x > this.#width + 50) b.x = -50;
    if (b.y < -50) b.y = this.#height + 50;
    if (b.y > this.#height - 50) b.y = -50;
  }

  draw() {
    const ctx = this.#ctx;
    for (const b of this.#butterflies) {
      this.#drawTrails(ctx, b);
      this.#drawButterfly(ctx, b);
    }
  }

  #drawTrails(ctx: CanvasRenderingContext2D, b: Butterfly) {
    if (b.trails.length === 0) return;
    for (const t of b.trails) {
      ctx.globalAlpha = t.life * 0.35;
      ctx.fillStyle =
        b.type === 'monarch'
          ? '#ffaa55'
          : b.type === 'blue'
          ? '#88ccff'
          : b.type === 'yellow'
          ? '#ffee88'
          : '#ffffff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  #drawButterfly(ctx: CanvasRenderingContext2D, b: Butterfly) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const heading = Math.atan2(b.vy, b.vx);
    ctx.rotate(heading + Math.PI / 2);
    const wing = Math.sin(b.wingPhase) * 0.85;
    const s = b.size;

    // Antennae
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.35);
    ctx.quadraticCurveTo(-s * 0.3, -s * 1.15, -s * 0.55, -s * 1.35);
    ctx.moveTo(0, -s * 0.35);
    ctx.quadraticCurveTo(s * 0.3, -s * 1.15, s * 0.55, -s * 1.35);
    ctx.stroke();

    const drawWing = (side: 1 | -1) => {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(wing * side);

      if (b.type === 'monarch') {
        const grad = ctx.createLinearGradient(0, 0, 0, -s);
        grad.addColorStop(0, '#ff8800');
        grad.addColorStop(1, '#ff5500');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * 0.3, -s * 0.2, s * 0.9, -s * 0.5, s * 0.7, -s * 1.25);
        ctx.bezierCurveTo(s * 0.4, -s * 1.45, s * 0.1, -s * 1.15, 0, -s * 0.95);
        ctx.bezierCurveTo(-s * 0.1, -s * 1.15, -s * 0.3, -s * 1.35, -s * 0.5, -s * 1.05);
        ctx.bezierCurveTo(-s * 0.4, -s * 0.45, -s * 0.2, -s * 0.1, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Veins
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.2, -s * 0.85);
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.5, -s * 0.75);
        ctx.moveTo(0, 0);
        ctx.lineTo(s * 0.35, -s * 1.05);
        ctx.strokeStyle = 'rgba(20,20,20,0.75)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else if (b.type === 'blue') {
        const grad = ctx.createRadialGradient(0, -s * 0.5, s * 0.1, 0, -s * 0.5, s * 1.15);
        grad.addColorStop(0, '#aaffff');
        grad.addColorStop(0.45, '#4488ff');
        grad.addColorStop(1, '#0a2266');
        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(200,240,255,0.55)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * 0.35, -s * 0.25, s * 1.05, -s * 0.55, s * 0.85, -s * 1.35);
        ctx.bezierCurveTo(s * 0.5, -s * 1.55, s * 0.1, -s * 1.25, 0, -s * 1.05);
        ctx.bezierCurveTo(-s * 0.1, -s * 1.25, -s * 0.35, -s * 1.45, -s * 0.55, -s * 1.15);
        ctx.bezierCurveTo(-s * 0.45, -s * 0.5, -s * 0.25, -s * 0.15, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = b.type === 'yellow' ? '#ffdd44' : '#f8f8f0';
        ctx.strokeStyle = b.type === 'yellow' ? '#ccaa00' : '#ccc';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(s * 0.3, -s * 0.2, s * 0.85, -s * 0.5, s * 0.7, -s * 1.15);
        ctx.bezierCurveTo(s * 0.4, -s * 1.35, s * 0.1, -s * 1.05, 0, -s * 0.9);
        ctx.bezierCurveTo(-s * 0.1, -s * 1.05, -s * 0.3, -s * 1.25, -s * 0.5, -s * 0.95);
        ctx.bezierCurveTo(-s * 0.4, -s * 0.45, -s * 0.2, -s * 0.1, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    };

    drawWing(1);
    drawWing(-1);

    // Body segments
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.2, s * 0.13, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -s * 0.48, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, s * 0.16, s * 0.11, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
