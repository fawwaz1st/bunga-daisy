/**
 * WindField Module
 * 2D/3D wind vector field using Perlin noise
 * Influences flower sway and particle movement
 */

import { PHYSICS, Utils } from '../config.js';

export class WindField {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Wind state
        this.baseWind = { x: 0.3, y: 0 };
        this.currentWind = { x: 0, y: 0 };
        this.gustWind = { x: 0, y: 0 };

        // Noise offset for smooth animation
        this.noiseOffset = 0;

        // Cursor influence
        this.cursorInfluence = { x: 0, y: 0 };
        this.lastCursorX = 0;
        this.lastCursorY = 0;

        // Gust system
        this.gustActive = false;
        this.gustProgress = 0;
        this.gustDuration = 2000;
        this.gustDirection = { x: 1, y: 0 };

        // Perlin noise permutation table
        this.perm = this.generatePermutation();
    }

    generatePermutation() {
        const p = [];
        for (let i = 0; i < 256; i++) p[i] = i;

        // Shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }

        // Duplicate for overflow
        return [...p, ...p];
    }

    // Simplified Perlin noise
    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const A = this.perm[X] + Y;
        const B = this.perm[X + 1] + Y;

        return Utils.lerp(
            Utils.lerp(this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y), u),
            Utils.lerp(this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1), u),
            v
        );
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    update(deltaTime, cursorX, cursorY) {
        // Update noise offset for smooth wind variation
        this.noiseOffset += PHYSICS.windNoiseSpeed * deltaTime;

        // Calculate base wind from noise
        const noiseX = this.noise(this.noiseOffset, 0) * PHYSICS.windBaseStrength;
        const noiseY = this.noise(0, this.noiseOffset) * PHYSICS.windBaseStrength * 0.3;

        this.baseWind.x = noiseX;
        this.baseWind.y = noiseY;

        // Cursor influence (based on movement velocity)
        if (cursorX !== undefined && cursorY !== undefined) {
            const dx = cursorX - this.lastCursorX;
            const dy = cursorY - this.lastCursorY;

            // Smooth the cursor influence
            this.cursorInfluence.x = Utils.lerp(this.cursorInfluence.x, dx * 0.05, 0.1);
            this.cursorInfluence.y = Utils.lerp(this.cursorInfluence.y, dy * 0.02, 0.1);

            this.lastCursorX = cursorX;
            this.lastCursorY = cursorY;
        }

        // Process active gust
        if (this.gustActive) {
            this.gustProgress += deltaTime / this.gustDuration;

            if (this.gustProgress >= 1) {
                this.gustActive = false;
                this.gustProgress = 0;
                this.gustWind = { x: 0, y: 0 };
            } else {
                // Gust envelope: quick rise, slow fall
                const envelope = this.gustProgress < 0.2
                    ? this.gustProgress / 0.2
                    : 1 - ((this.gustProgress - 0.2) / 0.8);

                const strength = envelope * PHYSICS.windGustStrength;
                this.gustWind.x = this.gustDirection.x * strength;
                this.gustWind.y = this.gustDirection.y * strength * 0.3;
            }
        }

        // Combine all wind sources
        this.currentWind.x = this.baseWind.x + this.cursorInfluence.x + this.gustWind.x;
        this.currentWind.y = this.baseWind.y + this.cursorInfluence.y + this.gustWind.y;
    }

    // Trigger a wind gust (used in entrance animation)
    triggerGust(direction = { x: 1, y: 0 }, duration = 2000) {
        this.gustActive = true;
        this.gustProgress = 0;
        this.gustDuration = duration;
        this.gustDirection = Utils.normalize(direction.x, direction.y);
    }

    // Get wind at a specific position (with spatial variation)
    getWindAt(x, y) {
        const spatialNoise = this.noise(
            x * PHYSICS.windNoiseScale + this.noiseOffset,
            y * PHYSICS.windNoiseScale
        );

        return {
            x: this.currentWind.x + spatialNoise * 0.1,
            y: this.currentWind.y + spatialNoise * 0.05
        };
    }

    // Get overall wind strength (for UI-less feedback)
    getStrength() {
        return Math.hypot(this.currentWind.x, this.currentWind.y);
    }

    // Get wind direction in radians
    getDirection() {
        return Math.atan2(this.currentWind.y, this.currentWind.x);
    }
}
