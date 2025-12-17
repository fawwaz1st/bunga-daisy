/**
 * EntranceAnimation Module
 * Orchestrates the cinematic entrance sequence (Stages A-D)
 */

import { TIMING, Easing } from '../config.js';

export class EntranceAnimation {
    constructor() {
        this.startTime = 0;
        this.isPlaying = false;
        this.isComplete = false;

        this.currentStage = null;
        this.stageCallbacks = {
            stageA: null,
            stageB: null,
            stageC: null,
            stageD: null,
            complete: null
        };

        // Track which stages have been triggered
        this.triggeredStages = {
            A: false,
            B: false,
            C: false,
            D: false
        };
    }

    // Register callbacks for each stage
    onStageA(callback) { this.stageCallbacks.stageA = callback; }
    onStageB(callback) { this.stageCallbacks.stageB = callback; }
    onStageC(callback) { this.stageCallbacks.stageC = callback; }
    onStageD(callback) { this.stageCallbacks.stageD = callback; }
    onComplete(callback) { this.stageCallbacks.complete = callback; }

    start() {
        this.startTime = performance.now();
        this.isPlaying = true;
        this.currentStage = 'A';

        // Trigger Stage A immediately
        if (this.stageCallbacks.stageA) {
            this.stageCallbacks.stageA();
        }
        this.triggeredStages.A = true;
    }

    update() {
        if (!this.isPlaying || this.isComplete) return;

        const elapsed = performance.now() - this.startTime;

        // Stage B: Stem growth (1.5s - 4s)
        if (!this.triggeredStages.B && elapsed >= TIMING.stageB.start) {
            this.currentStage = 'B';
            this.triggeredStages.B = true;
            if (this.stageCallbacks.stageB) {
                this.stageCallbacks.stageB();
            }
        }

        // Stage C: Flower bloom (4s - 7s)
        if (!this.triggeredStages.C && elapsed >= TIMING.stageC.start) {
            this.currentStage = 'C';
            this.triggeredStages.C = true;
            if (this.stageCallbacks.stageC) {
                this.stageCallbacks.stageC();
            }
        }

        // Stage D: Wind gust and settle (7s - 9s)
        if (!this.triggeredStages.D && elapsed >= TIMING.stageD.start) {
            this.currentStage = 'D';
            this.triggeredStages.D = true;
            if (this.stageCallbacks.stageD) {
                this.stageCallbacks.stageD();
            }
        }

        // Complete
        if (elapsed >= TIMING.stageD.end) {
            this.isPlaying = false;
            this.isComplete = true;
            this.currentStage = 'complete';
            if (this.stageCallbacks.complete) {
                this.stageCallbacks.complete();
            }
        }
    }

    // Get progress for a specific stage (0-1)
    getStageProgress(stage) {
        if (!this.isPlaying && !this.isComplete) return 0;

        const elapsed = performance.now() - this.startTime;
        const timing = TIMING[`stage${stage}`];

        if (!timing) return 0;
        if (elapsed < timing.start) return 0;
        if (elapsed >= timing.end) return 1;

        return (elapsed - timing.start) / (timing.end - timing.start);
    }

    // Get eased progress for smooth animations
    getEasedProgress(stage) {
        return Easing.cubicInOut(this.getStageProgress(stage));
    }

    getCurrentStage() {
        return this.currentStage;
    }

    getIsComplete() {
        return this.isComplete;
    }
}
