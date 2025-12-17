/**
 * PollenTrail Module
 * Golden pollen particles following cursor with velocity-adaptive intensity
 */

import { COLORS, PHYSICS, Utils } from '../config.js';

export class PollenTrail {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;

        this.particles = [];
        this.maxParticles = PHYSICS.maxPollenParticles;

        // Cursor tracking
        this.cursorX = width / 2;
        this.cursorY = height / 2;
        this.lastX = this.cursorX;
        this.lastY = this.cursorY;
        this.velocity = 0;

        // Spawn control
        this.spawnAccumulator = 0;
        this.isActive = false;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    // Activate trail (when hovering flower)
    activate() {
        this.isActive = true;
    }

    deactivate() {
        this.isActive = false;
    }

    updateCursor(x, y) {
        this.lastX = this.cursorX;
        this.lastY = this.cursorY;
        this.cursorX = x;
        this.cursorY = y;

        // Calculate velocity
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        this.velocity = Math.min(20, Math.hypot(dx, dy));
    }

    spawn(count = 1) {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const offsetX = Utils.randomRange(-5, 5);
            const offsetY = Utils.randomRange(-5, 5);

            this.particles.push({
                x: this.cursorX + offsetX,
                y: this.cursorY + offsetY,
                vx: Utils.randomRange(-0.5, 0.5) + (this.cursorX - this.lastX) * 0.1,
                vy: Utils.randomRange(-0.5, 0.2) + (this.cursorY - this.lastY) * 0.1,
                size: Utils.randomRange(2, 4),
                life: 1,
                decay: Utils.randomRange(0.02, 0.04)
            });
        }
    }

    update(deltaTime) {
        // Spawn particles if active and cursor moving
        if (this.isActive && this.velocity > 1) {
            this.spawnAccumulator += this.velocity * deltaTime * 0.01;

            while (this.spawnAccumulator >= 1 && this.particles.length < this.maxParticles) {
                this.spawn();
                this.spawnAccumulator -= 1;
            }
        }

        // Update particles
        this.particles = this.particles.filter(p => {
            // Apply gravity and dissipation
            p.vy += 0.01;
            p.vx *= PHYSICS.pollenDissipateSpeed;
            p.vy *= PHYSICS.pollenDissipateSpeed;

            p.x += p.vx;
            p.y += p.vy;

            p.life -= p.decay;

            return p.life > 0;
        });
    }

    draw() {
        const ctx = this.ctx;

        this.particles.forEach(p => {
            const alpha = p.life * 0.8;

            // Glow
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
            ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 240, 180, ${alpha})`;
            ctx.fill();
        });
    }
}
