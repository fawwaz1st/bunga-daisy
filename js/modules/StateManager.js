/**
 * StateManager Module
 * Manages idle charm, curiosity mode, and night shift states
 */

import { TIMING } from '../config.js';

export class StateManager {
    constructor() {
        // Idle state
        this.lastInteractionTime = performance.now();
        this.isIdle = false;

        // Curiosity mode
        this.interactionCount = 0;
        this.interactionTypes = new Set();
        this.curiosityActive = false;
        this.curiosityEndTime = 0;
        this.lastCursorX = 0;
        this.lastCursorY = 0;

        // Night shift
        this.sessionStartTime = performance.now();
        this.nightShiftActive = false;
        this.nightShiftProgress = 0;

        // Callbacks
        this.callbacks = {
            onIdleStart: null,
            onIdleEnd: null,
            onCuriosityStart: null,
            onCuriosityEnd: null,
            onNightShift: null
        };
    }

    // Register callbacks
    onIdleStart(callback) { this.callbacks.onIdleStart = callback; }
    onIdleEnd(callback) { this.callbacks.onIdleEnd = callback; }
    onCuriosityStart(callback) { this.callbacks.onCuriosityStart = callback; }
    onCuriosityEnd(callback) { this.callbacks.onCuriosityEnd = callback; }
    onNightShift(callback) { this.callbacks.onNightShift = callback; }

    // Record interaction
    recordInteraction(type, cursorX, cursorY) {
        const wasIdle = this.isIdle;

        this.lastInteractionTime = performance.now();
        this.isIdle = false;

        if (wasIdle && this.callbacks.onIdleEnd) {
            this.callbacks.onIdleEnd();
        }

        // Track unique interaction types for curiosity mode
        this.interactionTypes.add(type);
        this.interactionCount++;

        this.lastCursorX = cursorX;
        this.lastCursorY = cursorY;

        // Activate curiosity mode after 3 different types
        if (this.interactionTypes.size >= 3 && !this.curiosityActive) {
            this.activateCuriosity();
        }
    }

    activateCuriosity() {
        this.curiosityActive = true;
        this.curiosityEndTime = performance.now() + TIMING.curiosityDuration;

        if (this.callbacks.onCuriosityStart) {
            this.callbacks.onCuriosityStart(this.lastCursorX, this.lastCursorY);
        }
    }

    update() {
        const now = performance.now();

        // Check idle
        if (!this.isIdle && now - this.lastInteractionTime > TIMING.idleTimeout) {
            this.isIdle = true;
            if (this.callbacks.onIdleStart) {
                this.callbacks.onIdleStart();
            }
        }

        // Check curiosity mode expiration
        if (this.curiosityActive && now >= this.curiosityEndTime) {
            this.curiosityActive = false;
            this.interactionTypes.clear();
            if (this.callbacks.onCuriosityEnd) {
                this.callbacks.onCuriosityEnd();
            }
        }

        // Check night shift
        const sessionDuration = now - this.sessionStartTime;
        if (!this.nightShiftActive && sessionDuration > TIMING.nightShiftThreshold) {
            this.nightShiftActive = true;
        }

        // Progress night shift over 60 seconds
        if (this.nightShiftActive) {
            const nightStartTime = this.sessionStartTime + TIMING.nightShiftThreshold;
            const nightProgress = (now - nightStartTime) / TIMING.nightTransitionDuration;

            if (nightProgress > this.nightShiftProgress) {
                this.nightShiftProgress = Math.min(1, nightProgress);

                if (this.callbacks.onNightShift) {
                    this.callbacks.onNightShift(this.nightShiftProgress);
                }
            }
        }
    }

    getIsIdle() {
        return this.isIdle;
    }

    getCuriosityActive() {
        return this.curiosityActive;
    }

    getNightProgress() {
        return this.nightShiftProgress;
    }

    // Reset session (for testing)
    resetSession() {
        this.sessionStartTime = performance.now();
        this.nightShiftActive = false;
        this.nightShiftProgress = 0;
    }
}
