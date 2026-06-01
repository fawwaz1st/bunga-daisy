/**
 * StateManager - TypeScript port
 */
import { TIMING } from '../config.js';

export class StateManager {
  #lastInteractionTime = performance.now();
  #isIdle = false;
  #interactionCount = 0;
  #interactionTypes = new Set<string>();
  #curiosityActive = false;
  #curiosityEndTime = 0;
  #lastCursorX = 0;
  #lastCursorY = 0;
  #sessionStartTime = performance.now();
  #nightShiftActive = false;
  #nightShiftProgress = 0;

  #callbacks: {
    onIdleStart?: () => void;
    onIdleEnd?: () => void;
    onCuriosityStart?: (x: number, y: number) => void;
    onCuriosityEnd?: () => void;
    onNightShift?: (progress: number) => void;
  } = {};

  onIdleStart(cb: () => void) { this.#callbacks.onIdleStart = cb; }
  onIdleEnd(cb: () => void) { this.#callbacks.onIdleEnd = cb; }
  onCuriosityStart(cb: (x: number, y: number) => void) { this.#callbacks.onCuriosityStart = cb; }
  onCuriosityEnd(cb: () => void) { this.#callbacks.onCuriosityEnd = cb; }
  onNightShift(cb: (progress: number) => void) { this.#callbacks.onNightShift = cb; }

  recordInteraction(type: string, cursorX: number, cursorY: number) {
    const wasIdle = this.#isIdle;
    this.#lastInteractionTime = performance.now();
    this.#isIdle = false;
    if (wasIdle) this.#callbacks.onIdleEnd?.();
    this.#interactionTypes.add(type);
    this.#interactionCount++;
    this.#lastCursorX = cursorX; this.#lastCursorY = cursorY;
    if (this.#interactionTypes.size >= 3 && !this.#curiosityActive) {
      this.#curiosityActive = true;
      this.#curiosityEndTime = performance.now() + TIMING.curiosityDuration;
      this.#callbacks.onCuriosityStart?.(cursorX, cursorY);
    }
  }

  update() {
    const now = performance.now();
    if (!this.#isIdle && now - this.#lastInteractionTime > TIMING.idleTimeout) {
      this.#isIdle = true; this.#callbacks.onIdleStart?.();
    }
    if (this.#curiosityActive && now >= this.#curiosityEndTime) {
      this.#curiosityActive = false; this.#interactionTypes.clear();
      this.#callbacks.onCuriosityEnd?.();
    }
    const sessionDuration = now - this.#sessionStartTime;
    if (!this.#nightShiftActive && sessionDuration > TIMING.nightShiftThreshold) {
      this.#nightShiftActive = true;
    }
    if (this.#nightShiftActive) {
      const nightStart = this.#sessionStartTime + TIMING.nightShiftThreshold;
      const progress = Math.min(1, (now - nightStart) / TIMING.nightTransitionDuration);
      if (progress > this.#nightShiftProgress) {
        this.#nightShiftProgress = progress;
        this.#callbacks.onNightShift?.(progress);
      }
    }
  }

  get isIdle() { return this.#isIdle; }
  get curiosityActive() { return this.#curiosityActive; }
  get nightProgress() { return this.#nightShiftProgress; }
}
