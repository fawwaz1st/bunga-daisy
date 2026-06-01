/**
 * EntranceAnimation - TypeScript port
 */
import { TIMING, Easing } from '../config.js';

export class EntranceAnimation {
  #startTime = 0;
  #isPlaying = false;
  #isComplete = false;
  #currentStage: string | null = null;
  #triggered = { A: false, B: false, C: false, D: false };
  #callbacks: { stageA?: () => void; stageB?: () => void; stageC?: () => void; stageD?: () => void; complete?: () => void } = {};

  onStageA(cb: () => void) { this.#callbacks.stageA = cb; }
  onStageB(cb: () => void) { this.#callbacks.stageB = cb; }
  onStageC(cb: () => void) { this.#callbacks.stageC = cb; }
  onStageD(cb: () => void) { this.#callbacks.stageD = cb; }
  onComplete(cb: () => void) { this.#callbacks.complete = cb; }

  start() {
    this.#startTime = performance.now();
    this.#isPlaying = true; this.#currentStage = 'A';
    this.#callbacks.stageA?.(); this.#triggered.A = true;
  }

  update() {
    if (!this.#isPlaying || this.#isComplete) return;
    const elapsed = performance.now() - this.#startTime;
    if (!this.#triggered.B && elapsed >= TIMING.stageB.start) { this.#currentStage = 'B'; this.#triggered.B = true; this.#callbacks.stageB?.(); }
    if (!this.#triggered.C && elapsed >= TIMING.stageC.start) { this.#currentStage = 'C'; this.#triggered.C = true; this.#callbacks.stageC?.(); }
    if (!this.#triggered.D && elapsed >= TIMING.stageD.start) { this.#currentStage = 'D'; this.#triggered.D = true; this.#callbacks.stageD?.(); }
    if (elapsed >= TIMING.stageD.end) { this.#isPlaying = false; this.#isComplete = true; this.#currentStage = 'complete'; this.#callbacks.complete?.(); }
  }

  getStageProgress(stage: string): number {
    if (!this.#isPlaying && !this.#isComplete) return 0;
    const timing = (TIMING as any)[`stage${stage}`];
    if (!timing) return 0;
    const elapsed = performance.now() - this.#startTime;
    if (elapsed < timing.start) return 0;
    if (elapsed >= timing.end) return 1;
    return (elapsed - timing.start) / (timing.end - timing.start);
  }

  getEasedProgress(stage: string) { return Easing.cubicInOut(this.getStageProgress(stage)); }
  get currentStage() { return this.#currentStage; }
  get isComplete() { return this.#isComplete; }
}
