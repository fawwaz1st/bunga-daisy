/**
 * CorePulse Module
 * Flower center with micro-texture, breathing pulsation, and shimmer effects
 */

import { COLORS, PHYSICS, TIMING, Utils } from '../config.js';

export class CorePulse {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseRadius = radius;

        // Pulsation state
        this.pulsePhase = 0;
        this.pulseIntensity = PHYSICS.centerPulseAmount;
        this.breathingDepth = 1; // Multiplier for breathing

        // Shimmer effect
        this.shimmerActive = false;
        this.shimmerProgress = 0;
        this.shimmerParticles = [];

        // Glow state
        this.glowIntensity = 0;
        this.targetGlow = 0;

        // Magnetism (weak cursor attraction)
        this.magnetOffset = { x: 0, y: 0 };

        // Animation
        this.visible = false;
        this.fillProgress = 0;

        // Micro-texture seeds
        this.textureSeeds = [];
        for (let i = 0; i < 50; i++) {
            this.textureSeeds.push({
                angle: Utils.randomRange(0, Math.PI * 2),
                distance: Utils.randomRange(0.2, 0.9),
                size: Utils.randomRange(1, 3),
                brightness: Utils.randomRange(0.8, 1.2)
            });
        }

        // Orbiting micro-particles
        this.orbitParticles = [];
        this.orbitActive = false;
    }

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
    }

    startFill() {
        this.visible = true;
        this.fillProgress = 0;
    }

    // Check if point is within center
    containsPoint(px, py) {
        if (!this.visible || this.fillProgress < 0.5) return false;

        const dx = px - (this.x + this.magnetOffset.x);
        const dy = py - (this.y + this.magnetOffset.y);
        return Math.hypot(dx, dy) < this.radius * this.fillProgress;
    }

    // Hover effects
    setHovered(hovered, cursorX, cursorY) {
        if (hovered) {
            this.targetGlow = 0.4;
            this.breathingDepth = 1.5;
            this.startOrbit();

            // Weak magnetism toward cursor
            const dx = cursorX - this.x;
            const dy = cursorY - this.y;
            this.magnetOffset.x = dx * 0.02;
            this.magnetOffset.y = dy * 0.02;
        } else {
            this.targetGlow = 0;
            this.breathingDepth = 1;
            this.stopOrbit();
            this.magnetOffset = { x: 0, y: 0 };
        }
    }

    // Click effect
    triggerClick() {
        this.triggerShimmer();
        this.pulseIntensity = PHYSICS.centerPulseAmount * 2;
        setTimeout(() => {
            this.pulseIntensity = PHYSICS.centerPulseAmount;
        }, 500);
    }

    // Shimmer effect
    triggerShimmer() {
        this.shimmerActive = true;
        this.shimmerProgress = 0;

        // Create shimmer particles
        this.shimmerParticles = [];
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.shimmerParticles.push({
                angle,
                distance: this.radius * 0.5,
                targetDistance: this.radius * 1.5,
                alpha: 1
            });
        }
    }

    // Start orbiting particles (hover effect)
    startOrbit() {
        if (this.orbitActive) return;
        this.orbitActive = true;

        this.orbitParticles = [];
        for (let i = 0; i < 6; i++) {
            this.orbitParticles.push({
                angle: (i / 6) * Math.PI * 2,
                speed: Utils.randomRange(0.5, 1),
                distance: this.radius * 1.2,
                size: Utils.randomRange(1, 2),
                alpha: 0
            });
        }
    }

    stopOrbit() {
        this.orbitActive = false;
    }

    // Sync with audio (called from AudioLayer)
    syncWithAudio(intensity) {
        this.pulseIntensity = PHYSICS.centerPulseAmount * (1 + intensity * 0.5);
    }

    update(deltaTime, musicIntensity = 0) {
        if (!this.visible) return;

        // Fill animation
        if (this.fillProgress < 1) {
            this.fillProgress += deltaTime * 0.0008;
            this.fillProgress = Math.min(1, this.fillProgress);
        }

        // Breathing pulsation
        this.pulsePhase += deltaTime * 0.001 * PHYSICS.centerPulseSpeed;
        const breathe = Math.sin(this.pulsePhase) * this.pulseIntensity * this.breathingDepth;
        this.radius = this.baseRadius * (1 + breathe) * this.fillProgress;

        // Sync with music if provided
        if (musicIntensity > 0) {
            this.radius *= 1 + musicIntensity * 0.02;
        }

        // Glow lerp
        this.glowIntensity = Utils.lerp(this.glowIntensity, this.targetGlow, 0.1);

        // Magnetism decay
        this.magnetOffset.x *= 0.95;
        this.magnetOffset.y *= 0.95;

        // Shimmer update
        if (this.shimmerActive) {
            this.shimmerProgress += deltaTime / TIMING.shimmerDuration;

            this.shimmerParticles.forEach(p => {
                p.distance = Utils.lerp(p.distance, p.targetDistance, 0.1);
                p.alpha = 1 - this.shimmerProgress;
            });

            if (this.shimmerProgress >= 1) {
                this.shimmerActive = false;
                this.shimmerParticles = [];
            }
        }

        // Orbit update
        if (this.orbitActive) {
            this.orbitParticles.forEach(p => {
                p.angle += deltaTime * 0.002 * p.speed;
                p.alpha = Utils.lerp(p.alpha, 0.6, 0.05);
            });
        } else {
            this.orbitParticles.forEach(p => {
                p.alpha *= 0.9;
            });
            if (this.orbitParticles.length && this.orbitParticles[0].alpha < 0.01) {
                this.orbitParticles = [];
            }
        }
    }

    draw(ctx) {
        if (!this.visible || this.fillProgress <= 0) return;

        const cx = this.x + this.magnetOffset.x;
        const cy = this.y + this.magnetOffset.y;

        ctx.save();

        // Radial glow (hover effect)
        if (this.glowIntensity > 0.01) {
            const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.radius * 2);
            glowGradient.addColorStop(0, `rgba(230, 200, 74, ${this.glowIntensity * 0.3})`);
            glowGradient.addColorStop(0.5, `rgba(230, 200, 74, ${this.glowIntensity * 0.1})`);
            glowGradient.addColorStop(1, 'rgba(230, 200, 74, 0)');

            ctx.beginPath();
            ctx.arc(cx, cy, this.radius * 2, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();
        }

        // Main center gradient
        const gradient = ctx.createRadialGradient(
            cx - this.radius * 0.2,
            cy - this.radius * 0.2,
            0,
            cx, cy, this.radius
        );
        gradient.addColorStop(0, COLORS.centerOuter);
        gradient.addColorStop(0.6, COLORS.centerInner);
        gradient.addColorStop(1, COLORS.centerDark);

        ctx.beginPath();
        ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Micro-texture (small dots)
        this.textureSeeds.forEach(seed => {
            if (seed.distance > this.fillProgress) return;

            const x = cx + Math.cos(seed.angle) * seed.distance * this.radius;
            const y = cy + Math.sin(seed.angle) * seed.distance * this.radius;

            ctx.beginPath();
            ctx.arc(x, y, seed.size * this.fillProgress, 0, Math.PI * 2);

            const brightness = seed.brightness > 1
                ? COLORS.centerOuter
                : COLORS.centerDark;
            ctx.fillStyle = brightness;
            ctx.globalAlpha = 0.3;
            ctx.fill();
        });

        ctx.globalAlpha = 1;

        // Shimmer particles
        this.shimmerParticles.forEach(p => {
            if (p.alpha <= 0) return;

            const x = cx + Math.cos(p.angle) * p.distance;
            const y = cy + Math.sin(p.angle) * p.distance;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 250, 200, ${p.alpha})`;
            ctx.fill();
        });

        // Orbit particles
        this.orbitParticles.forEach(p => {
            if (p.alpha <= 0.01) return;

            const x = cx + Math.cos(p.angle) * p.distance;
            const y = cy + Math.sin(p.angle) * p.distance;

            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(230, 200, 100, ${p.alpha})`;
            ctx.fill();
        });

        ctx.restore();
    }
}
