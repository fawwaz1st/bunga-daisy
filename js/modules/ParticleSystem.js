/**
 * ParticleSystem Module
 * Manages dust, pollen, bokeh, and firefly particles
 * Optimized with batching and particle cap
 */

import { COLORS, PHYSICS, Utils } from '../config.js';

class Particle {
    constructor(type, x, y, options = {}) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.life = 1;
        this.maxLife = options.maxLife || 1;
        this.decay = options.decay || 0.01;
        this.size = options.size || 2;
        this.color = options.color || COLORS.dustMote;
        this.alpha = options.alpha || 0.5;
        this.phase = Math.random() * Math.PI * 2;
    }

    update(deltaTime, wind) {
        // Apply wind
        this.vx += wind.x * 0.01;
        this.vy += wind.y * 0.01;

        // Apply velocity
        this.x += this.vx * deltaTime * 0.05;
        this.y += this.vy * deltaTime * 0.05;

        // Decay
        this.life -= this.decay * deltaTime * 0.01;

        // Type-specific behavior
        if (this.type === 'dust') {
            // Gentle floating
            this.vy -= 0.001 * deltaTime;
            this.x += Math.sin(performance.now() * 0.001 + this.phase) * 0.1;
        } else if (this.type === 'pollen') {
            // Quick dissipation
            this.vx *= PHYSICS.pollenDissipateSpeed;
            this.vy *= PHYSICS.pollenDissipateSpeed;
        } else if (this.type === 'firefly') {
            // Gentle random motion
            this.vx += (Math.random() - 0.5) * 0.02;
            this.vy += (Math.random() - 0.5) * 0.02;
            this.vx *= 0.98;
            this.vy *= 0.98;
        }

        return this.life > 0;
    }
}

export class ParticleSystem {
    constructor(ctx, width, height, capabilities) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.capabilities = capabilities;

        // Particle pools
        this.dustParticles = [];
        this.pollenParticles = [];
        this.bokehParticles = [];
        this.fireflies = [];

        // Caps based on device capability
        this.maxDust = capabilities.maxParticles;
        this.maxPollen = Math.floor(PHYSICS.maxPollenParticles * (capabilities.isLowEnd ? 0.5 : 1));
        this.maxFireflies = capabilities.isLowEnd ? 4 : PHYSICS.maxFireflies;

        // Cursor tracking for fade
        this.cursorX = width / 2;
        this.cursorY = height / 2;

        // Night mode
        this.nightMode = false;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    // Spawn ambient dust particles
    spawnDust(count = 1) {
        for (let i = 0; i < count && this.dustParticles.length < this.maxDust; i++) {
            const edge = Math.floor(Math.random() * 4);
            let x, y;

            switch (edge) {
                case 0: x = Math.random() * this.width; y = -10; break;
                case 1: x = this.width + 10; y = Math.random() * this.height; break;
                case 2: x = Math.random() * this.width; y = this.height + 10; break;
                default: x = -10; y = Math.random() * this.height;
            }

            this.dustParticles.push(new Particle('dust', x, y, {
                vx: Utils.randomRange(-0.5, 0.5),
                vy: Utils.randomRange(-0.3, -0.1),
                size: Utils.randomRange(1, 3),
                alpha: Utils.randomRange(0.1, 0.3),
                decay: Utils.randomRange(0.002, 0.005),
                color: COLORS.dustMote
            }));
        }
    }

    // Spawn pollen trail from cursor
    spawnPollen(x, y, velocity = 1) {
        if (this.pollenParticles.length >= this.maxPollen) return;

        const count = Math.min(3, Math.floor(velocity * 2));

        for (let i = 0; i < count; i++) {
            this.pollenParticles.push(new Particle('pollen', x, y, {
                vx: Utils.randomRange(-1, 1) * velocity,
                vy: Utils.randomRange(-1, 0.5) * velocity,
                size: Utils.randomRange(2, 4),
                alpha: Utils.randomRange(0.4, 0.7),
                decay: Utils.randomRange(0.02, 0.04),
                color: COLORS.pollenGold
            }));
        }
    }

    // Spawn radial pollen burst (for center click)
    spawnPollenBurst(x, y, count = 15) {
        for (let i = 0; i < count && this.pollenParticles.length < this.maxPollen * 2; i++) {
            const angle = (i / count) * Math.PI * 2 + Utils.randomRange(-0.2, 0.2);
            const speed = Utils.randomRange(1, 3);

            this.pollenParticles.push(new Particle('pollen', x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.randomRange(2, 5),
                alpha: Utils.randomRange(0.5, 0.8),
                decay: Utils.randomRange(0.015, 0.025),
                color: COLORS.pollenGold
            }));
        }
    }

    // Spawn fireflies (night mode)
    spawnFireflies() {
        while (this.fireflies.length < this.maxFireflies) {
            // Only spawn at edges
            const edge = Math.random() > 0.5;
            const x = edge ? Utils.randomRange(0, this.width * 0.2) : Utils.randomRange(this.width * 0.8, this.width);
            const y = Utils.randomRange(this.height * 0.3, this.height * 0.8);

            this.fireflies.push(new Particle('firefly', x, y, {
                vx: Utils.randomRange(-0.2, 0.2),
                vy: Utils.randomRange(-0.1, 0.1),
                size: Utils.randomRange(3, 6),
                alpha: 0,
                decay: -0.005, // Negative = fade in
                maxLife: 3,
                color: COLORS.fireflyGlow
            }));
        }
    }

    setNightMode(enabled) {
        this.nightMode = enabled;
        if (enabled) {
            this.spawnFireflies();
        } else {
            this.fireflies = [];
        }
    }

    updateCursor(x, y) {
        this.cursorX = x;
        this.cursorY = y;
    }

    update(deltaTime, wind) {
        // Spawn ambient dust occasionally
        if (Math.random() < 0.02 && this.dustParticles.length < this.maxDust) {
            this.spawnDust();
        }

        // Update dust
        this.dustParticles = this.dustParticles.filter(p => {
            if (!p.update(deltaTime, wind)) return false;

            // Fade near cursor
            const distToCursor = Utils.distance(p.x, p.y, this.cursorX, this.cursorY);
            if (distToCursor < 100) {
                p.alpha *= 0.95;
            }

            // Remove if off screen
            if (p.x < -50 || p.x > this.width + 50 || p.y < -50 || p.y > this.height + 50) {
                return false;
            }

            return true;
        });

        // Update pollen
        this.pollenParticles = this.pollenParticles.filter(p => p.update(deltaTime, wind));

        // Update fireflies
        if (this.nightMode) {
            this.fireflies = this.fireflies.filter(p => {
                const alive = p.update(deltaTime, { x: 0, y: 0 });

                // Pulsing glow
                p.currentAlpha = Math.max(0, Math.min(0.8,
                    p.alpha + Math.sin(performance.now() * 0.003 + p.phase) * 0.3
                ));

                // Fade near cursor
                const distToCursor = Utils.distance(p.x, p.y, this.cursorX, this.cursorY);
                if (distToCursor < 150) {
                    p.currentAlpha *= 0.5;
                }

                // Wrap around screen edges
                if (p.x < -20) p.x = this.width + 20;
                if (p.x > this.width + 20) p.x = -20;
                if (p.y < this.height * 0.2) p.vy += 0.01;
                if (p.y > this.height * 0.9) p.vy -= 0.01;

                return alive || p.life < -2;
            });

            // Respawn fireflies
            if (this.fireflies.length < this.maxFireflies) {
                this.spawnFireflies();
            }
        }
    }

    draw() {
        const ctx = this.ctx;

        // Draw dust
        this.dustParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 192, 168, ${p.alpha * p.life})`;
            ctx.fill();
        });

        // Draw pollen with glow
        this.pollenParticles.forEach(p => {
            const alpha = p.alpha * p.life;

            // Outer glow
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            gradient.addColorStop(0, `rgba(212, 184, 74, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(212, 184, 74, ${alpha * 0.3})`);
            gradient.addColorStop(1, 'rgba(212, 184, 74, 0)');

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 240, 180, ${alpha})`;
            ctx.fill();
        });

        // Draw fireflies
        if (this.nightMode) {
            this.fireflies.forEach(p => {
                const alpha = p.currentAlpha || p.alpha;
                if (alpha <= 0) return;

                // Glow
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
                gradient.addColorStop(0, `rgba(255, 232, 152, ${alpha})`);
                gradient.addColorStop(0.3, `rgba(255, 232, 152, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'rgba(255, 232, 152, 0)');

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Bright core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 220, ${alpha})`;
                ctx.fill();
            });
        }
    }
}
