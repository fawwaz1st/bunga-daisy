/**
 * PetalModule
 * Individual petal with unique properties and interaction states
 */

import { COLORS, PHYSICS, TIMING, Utils, Easing } from '../config.js';

export class Petal {
    constructor(index, totalPetals, centerX, centerY, baseRadius) {
        this.index = index;
        this.totalPetals = totalPetals;

        // Position (angle around center)
        this.baseAngle = (index / totalPetals) * Math.PI * 2;
        this.angle = this.baseAngle;

        // Unique properties per petal
        this.hueOffset = Utils.randomRange(-8, 8);
        this.lengthVariation = Utils.randomRange(0.88, 1.12);
        this.widthVariation = Utils.randomRange(0.9, 1.1);
        this.phase = Utils.randomRange(0, Math.PI * 2);
        this.naturalFreq = Utils.randomRange(2.5, 4.5); // Natural oscillation frequency

        // Dimensions
        this.length = baseRadius * 0.8 * this.lengthVariation;
        this.width = baseRadius * 0.15 * this.widthVariation;

        // Spring-damper physics system
        this.tiltAngle = 0;
        this.tiltVelocity = 0;
        this.targetTilt = 0;
        this.tiltStiffness = 0.15 * Utils.randomRange(0.8, 1.2);
        this.tiltDamping = 0.12;

        this.spinAngle = 0;
        this.spinVelocity = 0;
        this.spinDamping = 0.92;

        this.bendAngle = 0; // Additional bend from wind
        this.bendVelocity = 0;
        this.bendStiffness = Utils.randomRange(0.08, 0.15);

        this.scale = 1;
        this.scaleVelocity = 0;
        this.targetScale = 1;

        // Interaction state
        this.isHovered = false;
        this.glowIntensity = 0;
        this.hueShift = 0;
        this.vibrationPhase = 0;

        // Animation
        this.bloomProgress = 0;
        this.visible = false;

        // Ripple effect
        this.rippleActive = false;
        this.rippleProgress = 0;
        this.rippleIntensity = 0;
    }

    // Start bloom animation with delay based on index
    startBloom(delay = 0) {
        setTimeout(() => {
            this.visible = true;
        }, delay);
    }

    // Get petal tip position for hit detection
    getTipPosition(centerX, centerY) {
        const displayAngle = this.angle + this.spinAngle;
        return {
            x: centerX + Math.cos(displayAngle) * this.length * this.scale * this.bloomProgress,
            y: centerY + Math.sin(displayAngle) * this.length * this.scale * this.bloomProgress
        };
    }

    // Check if point is within petal
    containsPoint(px, py, centerX, centerY) {
        if (!this.visible || this.bloomProgress < 0.5) return false;

        const displayAngle = this.angle + this.spinAngle;
        const petalLength = this.length * this.scale * this.bloomProgress;

        // Transform point to petal local space
        const dx = px - centerX;
        const dy = py - centerY;
        const distance = Math.hypot(dx, dy);

        // Check if within length
        if (distance > petalLength || distance < this.length * 0.1) return false;

        // Check angle alignment
        const pointAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(pointAngle - displayAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        // Width tolerance based on distance from center
        const widthAtPoint = (this.width * (1 - distance / petalLength * 0.5)) / distance;

        return angleDiff < widthAtPoint;
    }

    // Hover effect
    setHovered(hovered) {
        this.isHovered = hovered;
        if (hovered) {
            this.targetTilt = Utils.degToRad(Utils.randomRange(2, PHYSICS.petalTiltMax));
            this.hueShift = 2;
        } else {
            this.targetTilt = 0;
            this.hueShift = 0;
        }
    }

    // Click effect
    triggerClick() {
        const spinDirection = Math.random() > 0.5 ? 1 : -1;
        this.spinVelocity = Utils.degToRad(PHYSICS.petalSpinAngle) * spinDirection;
        this.targetScale = 1.05;
        setTimeout(() => { this.targetScale = 1; }, 200);
    }

    // Ripple from neighboring petal
    triggerRipple() {
        this.rippleActive = true;
        this.rippleProgress = 0;
        this.spinVelocity = Utils.degToRad(3) * (Math.random() > 0.5 ? 1 : -1);
    }

    // Bloom effect (center click)
    triggerBloom() {
        this.targetScale = PHYSICS.centerBloomScale;
        setTimeout(() => { this.targetScale = 1; }, 400);
    }

    update(deltaTime, wind) {
        if (!this.visible) return;

        const dt = deltaTime * 0.001; // Convert to seconds
        const time = performance.now() * 0.001;

        // Bloom animation with spring overshoot
        if (this.bloomProgress < 1) {
            const bloomSpeed = 0.8;
            this.bloomProgress += dt * bloomSpeed;
            this.bloomProgress = Math.min(1, this.bloomProgress);

            // Elastic overshoot at end
            if (this.bloomProgress >= 0.85) {
                const t = (this.bloomProgress - 0.85) / 0.15;
                const elastic = Math.sin(t * Math.PI * 2.5) * Math.exp(-t * 3);
                this.scale = 1 + elastic * 0.08;
            }
        }

        // ═══════════════════════════════════════════════════════
        // SPRING-DAMPER PHYSICS
        // ═══════════════════════════════════════════════════════

        // Wind force on bend angle
        const windForce = wind.x * 0.08 + wind.y * 0.02;
        const targetBend = windForce * (1 + Math.sin(time * this.naturalFreq + this.phase) * 0.3);

        // Spring-damper for bend (critical damping formula)
        const bendSpring = (targetBend - this.bendAngle) * this.bendStiffness;
        const bendDamp = -this.bendVelocity * this.tiltDamping;
        this.bendVelocity += (bendSpring + bendDamp) * dt * 60;
        this.bendAngle += this.bendVelocity * dt * 60;

        // Natural micro-sway
        const naturalSway = Math.sin(time * this.naturalFreq * 0.3 + this.phase) * 0.008;

        // Combine angle components
        this.angle = this.baseAngle + this.bendAngle + naturalSway;

        // Tilt spring-damper (for hover effect)
        const tiltSpring = (this.targetTilt - this.tiltAngle) * this.tiltStiffness;
        const tiltDamp = -this.tiltVelocity * this.tiltDamping;
        this.tiltVelocity += (tiltSpring + tiltDamp) * dt * 60;
        this.tiltAngle += this.tiltVelocity * dt * 60;

        // Hover vibration (subtle)
        if (this.isHovered) {
            this.vibrationPhase += dt * 25;
            this.tiltAngle += Math.sin(this.vibrationPhase) * 0.005;
        }

        // Spin with damping (for click effect)
        this.spinAngle += this.spinVelocity * dt * 60;
        this.spinVelocity *= Math.pow(this.spinDamping, dt * 60);

        // Spring back spin to zero
        const spinReturn = -this.spinAngle * 0.05;
        this.spinVelocity += spinReturn * dt * 60;

        // Scale spring
        const scaleDiff = this.targetScale - this.scale;
        this.scaleVelocity += scaleDiff * 0.15 * dt * 60;
        this.scaleVelocity *= 0.85; // Damping
        this.scale += this.scaleVelocity * dt * 60;

        // Glow intensity with smooth easing
        const targetGlow = this.isHovered ? 0.7 : 0;
        this.glowIntensity += (targetGlow - this.glowIntensity) * 0.08;

        // Ripple effect with decay
        if (this.rippleActive) {
            this.rippleProgress += dt * 4;
            this.rippleIntensity = Math.sin(this.rippleProgress * Math.PI) * (1 - this.rippleProgress);
            if (this.rippleProgress >= 1) {
                this.rippleActive = false;
                this.rippleProgress = 0;
                this.rippleIntensity = 0;
            }
        }
    }

    draw(ctx, centerX, centerY) {
        if (!this.visible || this.bloomProgress <= 0) return;

        const displayAngle = this.angle + this.spinAngle;
        const currentLength = this.length * this.scale * this.bloomProgress;
        const currentWidth = this.width * this.scale * this.bloomProgress;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(displayAngle);
        ctx.rotate(this.tiltAngle);

        // Petal shape
        ctx.beginPath();
        ctx.moveTo(0, 0);

        // Create petal with bezier curves
        ctx.bezierCurveTo(
            currentLength * 0.3, -currentWidth * 0.8,
            currentLength * 0.7, -currentWidth * 0.6,
            currentLength, 0
        );
        ctx.bezierCurveTo(
            currentLength * 0.7, currentWidth * 0.6,
            currentLength * 0.3, currentWidth * 0.8,
            0, 0
        );

        // Gradient fill for translucent effect
        const gradient = ctx.createLinearGradient(0, 0, currentLength, 0);

        // Apply hue shift
        const baseHue = 50 + this.hueOffset + this.hueShift;
        const baseSat = 5;
        const baseLit = 98;

        gradient.addColorStop(0, `hsl(${baseHue}, ${baseSat + 10}%, ${baseLit - 5}%)`);
        gradient.addColorStop(0.3, `hsl(${baseHue}, ${baseSat}%, ${baseLit}%)`);
        gradient.addColorStop(0.7, `hsl(${baseHue}, ${baseSat}%, ${baseLit}%)`);
        gradient.addColorStop(1, `hsl(${baseHue}, ${baseSat + 5}%, ${baseLit - 2}%)`);

        ctx.fillStyle = gradient;
        ctx.fill();

        // Subtle shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 2;

        // Edge glow on hover
        if (this.glowIntensity > 0.01) {
            ctx.strokeStyle = `rgba(255, 250, 220, ${this.glowIntensity})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Outer glow
            ctx.shadowColor = `rgba(255, 240, 180, ${this.glowIntensity * 0.5})`;
            ctx.shadowBlur = 10;
            ctx.stroke();
        }

        // Petal vein (subtle)
        ctx.beginPath();
        ctx.moveTo(currentLength * 0.1, 0);
        ctx.lineTo(currentLength * 0.85, 0);
        ctx.strokeStyle = `rgba(200, 190, 160, 0.2)`;
        ctx.lineWidth = 0.5;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.restore();
    }
}

export class PetalManager {
    constructor(centerX, centerY, radius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;

        this.petals = [];
        this.petalCount = PHYSICS.petalCount;

        // Create petals
        for (let i = 0; i < this.petalCount; i++) {
            this.petals.push(new Petal(i, this.petalCount, centerX, centerY, radius));
        }

        // Interaction tracking
        this.hoveredPetal = null;
        this.lastClickedIndex = -1;
    }

    updatePosition(centerX, centerY) {
        this.centerX = centerX;
        this.centerY = centerY;
    }

    // Start sequential bloom animation
    startBloom() {
        const baseDelay = 50;
        const randomOffset = 30;

        // Bloom in circular pattern with random offsets
        this.petals.forEach((petal, i) => {
            const delay = i * baseDelay + Utils.randomRange(0, randomOffset);
            petal.startBloom(delay);
        });
    }

    // Find petal at point
    getPetalAtPoint(x, y) {
        for (let i = this.petals.length - 1; i >= 0; i--) {
            if (this.petals[i].containsPoint(x, y, this.centerX, this.centerY)) {
                return this.petals[i];
            }
        }
        return null;
    }

    // Handle hover
    handleHover(x, y) {
        const petal = this.getPetalAtPoint(x, y);

        if (this.hoveredPetal !== petal) {
            if (this.hoveredPetal) {
                this.hoveredPetal.setHovered(false);
            }
            if (petal) {
                petal.setHovered(true);
            }
            this.hoveredPetal = petal;
        }

        return petal;
    }

    // Handle click
    handleClick(x, y) {
        const petal = this.getPetalAtPoint(x, y);

        if (petal) {
            petal.triggerClick();
            this.lastClickedIndex = petal.index;

            // Ripple to neighbors
            this.triggerRipple(petal.index);

            return petal;
        }

        return null;
    }

    // Propagate ripple to neighboring petals
    triggerRipple(sourceIndex) {
        const delays = [TIMING.rippleDelay, TIMING.rippleDelay * 2];

        [-1, 1].forEach((direction, i) => {
            setTimeout(() => {
                const neighborIndex = (sourceIndex + direction + this.petalCount) % this.petalCount;
                this.petals[neighborIndex].triggerRipple();

                // Second level ripple
                setTimeout(() => {
                    const neighbor2Index = (neighborIndex + direction + this.petalCount) % this.petalCount;
                    this.petals[neighbor2Index].triggerRipple();
                }, TIMING.rippleDelay);
            }, delays[i]);
        });
    }

    // Trigger bloom on all petals (center click)
    triggerAllBloom() {
        this.petals.forEach(petal => petal.triggerBloom());
    }

    // Increase responsiveness on one side (curiosity mode)
    setCuriositySide(angle) {
        this.petals.forEach(petal => {
            let angleDiff = Math.abs(petal.baseAngle - angle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            // Petals on the curious side are more responsive
            petal.bendStiffness = angleDiff < Math.PI / 2 ? 1.5 : 1;
        });
    }

    resetCuriosity() {
        this.petals.forEach(petal => {
            petal.bendStiffness = Utils.randomRange(0.8, 1.2);
        });
    }

    update(deltaTime, wind) {
        this.petals.forEach(petal => petal.update(deltaTime, wind));
    }

    draw(ctx) {
        // Draw petals back to front based on angle
        const sortedPetals = [...this.petals].sort((a, b) => {
            const aY = Math.sin(a.angle);
            const bY = Math.sin(b.angle);
            return aY - bY;
        });

        sortedPetals.forEach(petal => petal.draw(ctx, this.centerX, this.centerY));
    }
}
