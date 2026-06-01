import { PHYSICS, Utils } from '../config.js';
import type { Vec2 } from '../config.js';

export class WindField {
  #width = 0;
  #height = 0;
  #baseWind: Vec2 = { x: 0.3, y: 0 };
  #currentWind: Vec2 = { x: 0, y: 0 };
  #gustWind: Vec2 = { x: 0, y: 0 };
  #noiseOffset = 0;
  #cursorInfluence: Vec2 = { x: 0, y: 0 };
  #lastCursor: Vec2 = { x: 0, y: 0 };

  #gustActive = false;
  #gustProgress = 0;
  #gustDuration = 2000;
  #gustDirection: Vec2 = { x: 1, y: 0 };

  #perm: number[];

  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    this.#perm = this.#generatePermutation();
  }

  #generatePermutation(): number[] {
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  #fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }

  #grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = this.#fade(x), v = this.#fade(y);
    const A = this.#perm[X] + Y, B = this.#perm[X + 1] + Y;
    return Utils.lerp(
      Utils.lerp(this.#grad(this.#perm[A], x, y), this.#grad(this.#perm[B], x - 1, y), u),
      Utils.lerp(this.#grad(this.#perm[A + 1], x, y - 1), this.#grad(this.#perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  update(deltaTime: number, cursorX?: number, cursorY?: number) {
    this.#noiseOffset += PHYSICS.windNoiseSpeed * deltaTime;

    this.#baseWind.x = this.noise(this.#noiseOffset, 0) * PHYSICS.windBaseStrength;
    this.#baseWind.y = this.noise(0, this.#noiseOffset) * PHYSICS.windBaseStrength * 0.3;

    if (cursorX !== undefined && cursorY !== undefined) {
      const dx = cursorX - this.#lastCursor.x;
      const dy = cursorY - this.#lastCursor.y;
      this.#cursorInfluence.x = Utils.lerp(this.#cursorInfluence.x, dx * 0.05, 0.1);
      this.#cursorInfluence.y = Utils.lerp(this.#cursorInfluence.y, dy * 0.02, 0.1);
      this.#lastCursor = { x: cursorX, y: cursorY };
    }

    if (this.#gustActive) {
      this.#gustProgress += deltaTime / this.#gustDuration;
      if (this.#gustProgress >= 1) {
        this.#gustActive = false;
        this.#gustProgress = 0;
        this.#gustWind = { x: 0, y: 0 };
      } else {
        const envelope = this.#gustProgress < 0.2
          ? this.#gustProgress / 0.2
          : 1 - ((this.#gustProgress - 0.2) / 0.8);
        const strength = envelope * PHYSICS.windGustStrength;
        this.#gustWind.x = this.#gustDirection.x * strength;
        this.#gustWind.y = this.#gustDirection.y * strength * 0.3;
      }
    }

    this.#currentWind.x = this.#baseWind.x + this.#cursorInfluence.x + this.#gustWind.x;
    this.#currentWind.y = this.#baseWind.y + this.#cursorInfluence.y + this.#gustWind.y;
  }

  triggerGust(direction: Vec2 = { x: 1, y: 0 }, duration = 2000) {
    this.#gustActive = true;
    this.#gustProgress = 0;
    this.#gustDuration = duration;
    this.#gustDirection = Utils.normalize(direction.x, direction.y);
  }

  getWindAt(x: number, y: number): Vec2 {
    const spatial = this.noise(
      x * PHYSICS.windNoiseScale + this.#noiseOffset,
      y * PHYSICS.windNoiseScale
    );
    return {
      x: this.#currentWind.x + spatial * 0.1,
      y: this.#currentWind.y + spatial * 0.05
    };
  }

  getStrength(): number {
    return Math.hypot(this.#currentWind.x, this.#currentWind.y);
  }

  getDirection(): number {
    return Math.atan2(this.#currentWind.y, this.#currentWind.x);
  }
}
