/**
 * BeeSystem Module
 * Animated bees that visit the flower every 10 seconds
 * Follow flower when user moves it, leave after 10 seconds
 */

import { Utils } from '../config.js';

export class BeeSystem {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;

        // Bee pool
        this.bees = [];
        this.maxBees = 4;

        // Flower target
        this.flowerX = width / 2;
        this.flowerY = height / 2;

        // Timing
        this.visitInterval = 10000; // 10 seconds
        this.lastVisitTime = 0;
        this.time = 0;

        // Initialize bees off-screen
        this.initBees();
    }

    initBees() {
        this.bees = [];

        for (let i = 0; i < this.maxBees; i++) {
            this.bees.push(this.createBee(i));
        }
    }

    createBee(index) {
        const side = index % 4;
        let startX, startY;

        // Start from different edges
        switch (side) {
            case 0: startX = -50; startY = this.height * 0.3; break;
            case 1: startX = this.width + 50; startY = this.height * 0.4; break;
            case 2: startX = this.width * 0.3; startY = -50; break;
            default: startX = this.width * 0.7; startY = -50;
        }

        return {
            x: startX,
            y: startY,
            targetX: startX,
            targetY: startY,
            velocityX: 0,
            velocityY: 0,

            // Visual
            wingPhase: Utils.randomRange(0, Math.PI * 2),
            bobPhase: Utils.randomRange(0, Math.PI * 2),
            size: Utils.randomRange(6, 10),
            rotation: 0,

            // State
            state: 'idle', // idle, approaching, hovering, leaving
            hoverTime: 0,
            hoverDuration: Utils.randomRange(3000, 6000),
            hoverOffset: { x: Utils.randomRange(-30, 30), y: Utils.randomRange(-20, 20) },

            // Physics
            maxSpeed: Utils.randomRange(0.2, 0.4),
            acceleration: Utils.randomRange(0.005, 0.01),
            wanderAngle: 0
        };
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    updateFlowerPosition(x, y) {
        this.flowerX = x;
        this.flowerY = y;
    }

    update(deltaTime) {
        this.time += deltaTime;

        // Check if it's time for a bee visit
        if (this.time - this.lastVisitTime > this.visitInterval) {
            this.triggerVisit();
            this.lastVisitTime = this.time;
        }

        // Update each bee
        this.bees.forEach(bee => this.updateBee(bee, deltaTime));
    }

    triggerVisit() {
        // Find ONLY idle bee and send it to the flower (NOT leaving bees!)
        const idleBees = this.bees.filter(b => b.state === 'idle');

        if (idleBees.length > 0) {
            const bee = idleBees[Math.floor(Math.random() * idleBees.length)];
            bee.state = 'approaching';
            bee.hoverOffset = {
                x: Utils.randomRange(-25, 25),
                y: Utils.randomRange(-20, 15)
            };
            bee.hoverDuration = Utils.randomRange(4000, 7000); // 4-7 seconds hover
        }
    }

    updateBee(bee, deltaTime) {
        const dt = deltaTime * 0.001;

        // Wing animation
        bee.wingPhase += dt * 40;
        bee.bobPhase += dt * 3;

        switch (bee.state) {
            case 'idle':
                // Wander off-screen
                this.updateIdleBee(bee, dt);
                break;

            case 'approaching':
                this.updateApproachingBee(bee, dt);
                break;

            case 'hovering':
                this.updateHoveringBee(bee, dt, deltaTime);
                break;

            case 'leaving':
                this.updateLeavingBee(bee, dt);
                break;
        }

        // Calculate rotation based on velocity
        if (Math.abs(bee.velocityX) > 0.01 || Math.abs(bee.velocityY) > 0.01) {
            bee.rotation = Math.atan2(bee.velocityY, bee.velocityX);
        }
    }

    updateIdleBee(bee, dt) {
        // Gentle wandering off-screen
        bee.wanderAngle += (Math.random() - 0.5) * 2 * dt;

        const wanderX = Math.cos(bee.wanderAngle) * 0.05;
        const wanderY = Math.sin(bee.wanderAngle) * 0.05;

        bee.velocityX = Utils.lerp(bee.velocityX, wanderX, 0.02);
        bee.velocityY = Utils.lerp(bee.velocityY, wanderY, 0.02);

        bee.x += bee.velocityX * dt * 60;
        bee.y += bee.velocityY * dt * 60;
    }

    updateApproachingBee(bee, dt) {
        // Target: flower + hover offset
        const targetX = this.flowerX + bee.hoverOffset.x;
        const targetY = this.flowerY + bee.hoverOffset.y - 40; // Above flower

        const dx = targetX - bee.x;
        const dy = targetY - bee.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 15) {
            // Arrived at flower
            bee.state = 'hovering';
            bee.hoverTime = 0;
            return;
        }

        // Steering toward target
        const desiredVx = (dx / distance) * bee.maxSpeed;
        const desiredVy = (dy / distance) * bee.maxSpeed;

        // Add some wavering
        const waver = Math.sin(this.time * 0.005 + bee.bobPhase) * 0.05;

        bee.velocityX = Utils.lerp(bee.velocityX, desiredVx + waver, bee.acceleration * dt * 60);
        bee.velocityY = Utils.lerp(bee.velocityY, desiredVy, bee.acceleration * dt * 60);

        bee.x += bee.velocityX * dt * 60;
        bee.y += bee.velocityY * dt * 60;
    }

    updateHoveringBee(bee, dt, deltaTime) {
        bee.hoverTime += deltaTime;

        // Hover around the flower, following if it moves
        const targetX = this.flowerX + bee.hoverOffset.x;
        const targetY = this.flowerY + bee.hoverOffset.y - 35;

        // Gentle orbiting/bobbing
        const orbitX = Math.cos(this.time * 0.002 + bee.bobPhase) * 8;
        const orbitY = Math.sin(this.time * 0.003 + bee.bobPhase * 1.3) * 5;

        const dx = (targetX + orbitX) - bee.x;
        const dy = (targetY + orbitY) - bee.y;

        bee.velocityX = Utils.lerp(bee.velocityX, dx * 0.05, 0.1);
        bee.velocityY = Utils.lerp(bee.velocityY, dy * 0.05, 0.1);

        bee.x += bee.velocityX * dt * 60;
        bee.y += bee.velocityY * dt * 60;

        // Leave after hover duration
        if (bee.hoverTime > bee.hoverDuration) {
            bee.state = 'leaving';
            // Pick exit direction
            bee.targetX = bee.x + (Math.random() > 0.5 ? 1 : -1) * (this.width + 100);
            bee.targetY = Utils.randomRange(-50, this.height * 0.4);
        }
    }

    updateLeavingBee(bee, dt) {
        const dx = bee.targetX - bee.x;
        const dy = bee.targetY - bee.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20 || bee.x < -60 || bee.x > this.width + 60 || bee.y < -60) {
            // Reset bee to idle position
            bee.state = 'idle';
            bee.x = bee.targetX;
            bee.y = bee.targetY;
            bee.hoverDuration = Utils.randomRange(3000, 6000);
            return;
        }

        const desiredVx = (dx / distance) * bee.maxSpeed * 1.5;
        const desiredVy = (dy / distance) * bee.maxSpeed * 1.2;

        bee.velocityX = Utils.lerp(bee.velocityX, desiredVx, bee.acceleration * 2 * dt * 60);
        bee.velocityY = Utils.lerp(bee.velocityY, desiredVy, bee.acceleration * 2 * dt * 60);

        bee.x += bee.velocityX * dt * 60;
        bee.y += bee.velocityY * dt * 60;
    }

    draw() {
        this.bees.forEach(bee => this.drawBee(bee));
    }

    drawBee(bee) {
        if (bee.state === 'idle' &&
            (bee.x < -50 || bee.x > this.width + 50 || bee.y < -50 || bee.y > this.height + 50)) {
            return; // Don't draw off-screen idle bees
        }

        const ctx = this.ctx;
        const bob = Math.sin(bee.bobPhase) * 2;
        const x = bee.x;
        const y = bee.y + bob;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(bee.rotation);

        const size = bee.size;

        // Wings (animated)
        const wingAngle = Math.sin(bee.wingPhase) * 0.4;

        ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';

        // Top wings
        ctx.save();
        ctx.rotate(-0.3 + wingAngle);
        ctx.beginPath();
        ctx.ellipse(-size * 0.1, -size * 0.4, size * 0.6, size * 0.25, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.rotate(0.3 - wingAngle);
        ctx.beginPath();
        ctx.ellipse(-size * 0.1, size * 0.4, size * 0.6, size * 0.25, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Body
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stripes
        ctx.fillStyle = '#f0c040';
        ctx.beginPath();
        ctx.ellipse(size * 0.1, 0, size * 0.15, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-size * 0.2, 0, size * 0.1, size * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.arc(size * 0.5, 0, size * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(size * 0.55, -size * 0.08, size * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size * 0.55, size * 0.08, size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
