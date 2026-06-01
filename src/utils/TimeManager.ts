/**
 * TimeManager - Global time & delta time management
 * Fixed timestep physics support
 */
export class TimeManager {
  #lastTime = 0;
  #accumulator = 0;
  #fixedDt = 1000 / 60;
  #elapsed = 0;
  #frameCount = 0;

  get elapsed() { return this.#elapsed; }
  get frameCount() { return this.#frameCount; }

  reset() {
    this.#lastTime = performance.now();
    this.#accumulator = 0;
    this.#elapsed = 0;
    this.#frameCount = 0;
  }

  tick(now: number): { dt: number; fixedSteps: number } {
    const rawDt = now - this.#lastTime;
    this.#lastTime = now;
    this.#elapsed += rawDt;
    this.#frameCount++;

    const dt = Math.min(rawDt, 100); // cap delta
    this.#accumulator += dt;

    let fixedSteps = 0;
    while (this.#accumulator >= this.#fixedDt) {
      fixedSteps++;
      this.#accumulator -= this.#fixedDt;
    }

    return { dt, fixedSteps };
  }
}
