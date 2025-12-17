/**
 * DaisyFlower Module
 * Main controller coordinating stem, petals, and center
 */

import { COLORS, PHYSICS, Utils } from '../config.js';
import { Stem } from './Stem.js';
import { PetalManager } from './PetalModule.js';
import { CorePulse } from './CorePulse.js';

export class DaisyFlower {
    constructor(baseX, baseY, stemHeight, flowerRadius) {
        this.baseX = baseX;
        this.baseY = baseY;
        this.stemHeight = stemHeight;
        this.flowerRadius = flowerRadius;

        // Components
        this.stem = new Stem(baseX, baseY, stemHeight);
        this.petalManager = null;
        this.core = null;

        // State
        this.visible = false;
        this.growthStage = 'waiting'; // waiting, stem, flower, complete

        // Flower head position (updated from stem)
        this.flowerX = baseX;
        this.flowerY = baseY - stemHeight;
        this.flowerAngle = 0;
    }

    resize(baseX, baseY) {
        this.baseX = baseX;
        this.baseY = baseY;
        this.stem.baseX = baseX;
        this.stem.baseY = baseY;
    }

    // Stage B: Start stem growth
    startStemGrowth() {
        this.visible = true;
        this.growthStage = 'stem';
        this.stem.startGrowth();
    }

    // Stage C: Start flower bloom
    startFlowerBloom() {
        this.growthStage = 'flower';

        // Initialize flower components at current stem position
        const pos = this.stem.getFlowerPosition();

        this.petalManager = new PetalManager(pos.x, pos.y, this.flowerRadius);
        this.core = new CorePulse(pos.x, pos.y, this.flowerRadius * 0.25);

        // Start animations
        this.petalManager.startBloom();

        // Delay core fill for dramatic effect
        setTimeout(() => {
            this.core.startFill();
        }, 800);
    }

    // Complete growth
    completeGrowth() {
        this.growthStage = 'complete';
    }

    // Get center position for hit detection
    getCenterPosition() {
        return { x: this.flowerX, y: this.flowerY };
    }

    // Get flower head position for bees
    getFlowerHeadPosition() {
        return { x: this.flowerX, y: this.flowerY };
    }

    // Check if point is on center
    isCenterHovered(x, y) {
        return this.core && this.core.containsPoint(x, y);
    }

    // Handle hover
    handleHover(x, y) {
        if (!this.petalManager || !this.core) return { petal: null, center: false };

        // Check center first
        const centerHovered = this.core.containsPoint(x, y);
        this.core.setHovered(centerHovered, x, y);

        // Check petals if not on center
        let hoveredPetal = null;
        if (!centerHovered) {
            hoveredPetal = this.petalManager.handleHover(x, y);
        } else {
            // Clear petal hover if on center
            if (this.petalManager.hoveredPetal) {
                this.petalManager.hoveredPetal.setHovered(false);
                this.petalManager.hoveredPetal = null;
            }
        }

        return { petal: hoveredPetal, center: centerHovered };
    }

    // Handle click
    handleClick(x, y) {
        if (!this.petalManager || !this.core) return { petal: null, center: false };

        // Check center first
        if (this.core.containsPoint(x, y)) {
            this.triggerCenterClick();
            return { petal: null, center: true };
        }

        // Check petals
        const clickedPetal = this.petalManager.handleClick(x, y);
        return { petal: clickedPetal, center: false };
    }

    // Center click effects
    triggerCenterClick() {
        this.core.triggerClick();
        this.petalManager.triggerAllBloom();
        this.stem.triggerSlowSway();
    }

    // Set curiosity mode (responsive to one side)
    setCuriositySide(cursorX, cursorY) {
        if (!this.petalManager) return;

        const angle = Math.atan2(cursorY - this.flowerY, cursorX - this.flowerX);
        this.petalManager.setCuriositySide(angle);
    }

    resetCuriosity() {
        if (this.petalManager) {
            this.petalManager.resetCuriosity();
        }
    }

    // Sync with audio
    syncWithAudio(intensity) {
        if (this.core) {
            this.core.syncWithAudio(intensity);
        }
    }

    update(deltaTime, wind) {
        if (!this.visible) return;

        // Update stem
        this.stem.update(deltaTime, wind);

        // Get flower position from stem
        const pos = this.stem.getFlowerPosition();
        this.flowerX = pos.x;
        this.flowerY = pos.y;
        this.flowerAngle = pos.angle;

        // Update flower components
        if (this.petalManager) {
            this.petalManager.updatePosition(this.flowerX, this.flowerY);
            this.petalManager.update(deltaTime, wind);
        }

        if (this.core) {
            this.core.updatePosition(this.flowerX, this.flowerY);
            this.core.update(deltaTime);
        }
    }

    draw(ctx) {
        if (!this.visible) return;

        // Draw stem first
        this.stem.draw(ctx);

        // Draw flower head with slight rotation
        if (this.petalManager || this.core) {
            ctx.save();
            ctx.translate(this.flowerX, this.flowerY);
            ctx.rotate(this.flowerAngle);
            ctx.translate(-this.flowerX, -this.flowerY);

            // Draw petals
            if (this.petalManager) {
                this.petalManager.draw(ctx);
            }

            // Draw center on top
            if (this.core) {
                this.core.draw(ctx);
            }

            ctx.restore();
        }
    }
}
