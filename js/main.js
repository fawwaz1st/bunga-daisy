/**
 * Main Application Entry Point
 * Orchestrates all modules for the Interactive Daisy Experience
 */

import { getDeviceCapabilities, Utils } from './config.js';
import { BackgroundParallax } from './modules/BackgroundParallax.js';
import { WindField } from './modules/WindField.js';
import { ParticleSystem } from './modules/ParticleSystem.js';
import { DaisyFlower } from './modules/DaisyFlower.js';
import { PollenTrail } from './modules/PollenTrail.js';
import { AudioLayer } from './modules/AudioLayer.js';
import { EntranceAnimation } from './modules/EntranceAnimation.js';
import { StateManager } from './modules/StateManager.js';
import { InputHandler } from './modules/InputHandler.js';
import { BeeSystem } from './modules/BeeSystem.js';

class DaisyExperience {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Device capabilities
        this.capabilities = getDeviceCapabilities();

        // Dimensions
        this.width = 0;
        this.height = 0;

        // Modules (initialized in init())
        this.background = null;
        this.wind = null;
        this.particles = null;
        this.flower = null;
        this.pollenTrail = null;
        this.audio = null;
        this.entrance = null;
        this.stateManager = null;
        this.input = null;
        this.bees = null;

        // Animation state
        this.lastTime = 0;
        this.isRunning = false;
        this.audioPromptVisible = true;

        // FPS limiting for mobile
        this.frameInterval = 1000 / (this.capabilities.isMobile ? 30 : 60);
        this.lastFrameTime = 0;
        this.frameCount = 0;

        // Bind methods
        this.animate = this.animate.bind(this);
        this.resize = this.resize.bind(this);
        this.handleUserGesture = this.handleUserGesture.bind(this);
    }

    async init() {
        // Set up canvas size
        this.resize();
        window.addEventListener('resize', this.resize);

        // Initialize modules
        this.background = new BackgroundParallax(this.ctx, this.width, this.height);
        this.wind = new WindField(this.width, this.height);
        this.particles = new ParticleSystem(this.ctx, this.width, this.height, this.capabilities);
        this.pollenTrail = new PollenTrail(this.ctx, this.width, this.height);
        this.audio = new AudioLayer();
        this.entrance = new EntranceAnimation();
        this.stateManager = new StateManager();
        this.input = new InputHandler(this.canvas);

        // Create flower at center-bottom
        const flowerX = this.width * 0.5;
        const flowerY = this.height * 0.85;
        const stemHeight = Math.min(this.height * 0.4, 300);
        const flowerRadius = Math.min(this.width, this.height) * 0.12;

        this.flower = new DaisyFlower(flowerX, flowerY, stemHeight, flowerRadius);

        // Initialize bee system
        this.bees = new BeeSystem(this.ctx, this.width, this.height);

        // Set up entrance animation callbacks
        this.setupEntranceCallbacks();

        // Set up state manager callbacks
        this.setupStateCallbacks();

        // Set up input callbacks
        this.setupInputCallbacks();

        // Wait for user gesture to start audio
        this.setupAudioPrompt();

        // Initial draw (static)
        this.drawFrame(0);
    }

    setupAudioPrompt() {
        const prompt = document.getElementById('audio-prompt');

        const start = async (e) => {
            // Prevent default to avoid double-firing on mobile
            if (e) e.preventDefault();

            console.log('Starting audio...');

            // Initialize and start audio
            const success = await this.audio.init();
            console.log('Audio init result:', success);

            // Hide prompt
            prompt.classList.add('hidden');
            this.audioPromptVisible = false;

            // Start the experience
            this.startExperience();

            // Remove all listeners
            prompt.removeEventListener('click', start);
            prompt.removeEventListener('touchstart', start);
            prompt.removeEventListener('touchend', start);
        };

        // Use touchstart for iOS (more reliable for audio unlock)
        prompt.addEventListener('touchstart', start, { passive: false });
        prompt.addEventListener('touchend', start, { passive: false });
        prompt.addEventListener('click', start);
    }

    handleUserGesture() {
        // Called on first interaction - handled by audio prompt
    }

    startExperience() {
        // Start ambient pad
        this.audio.startAmbientPad();

        // Start entrance animation
        this.entrance.start();

        // Start animation loop
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.animate);
    }

    setupEntranceCallbacks() {
        // Stage A: Camera reveal, dust particles, music fade-in
        this.entrance.onStageA(() => {
            // Spawn initial dust particles
            this.particles.spawnDust(15);
        });

        // Stage B: Stem growth
        this.entrance.onStageB(() => {
            this.flower.startStemGrowth();
        });

        // Stage C: Flower bloom
        this.entrance.onStageC(() => {
            this.flower.startFlowerBloom();
        });

        // Stage D: Wind gust
        this.entrance.onStageD(() => {
            this.wind.triggerGust({ x: 1.5, y: 0.2 }, 2000);
            this.flower.completeGrowth();
        });

        // Complete
        this.entrance.onComplete(() => {
            // Experience is now fully interactive
        });
    }

    setupStateCallbacks() {
        // Idle mode: gentle micro-sway
        this.stateManager.onIdleStart(() => {
            // Flower will naturally sway from wind
        });

        this.stateManager.onIdleEnd(() => {
            // Resume normal responsiveness
        });

        // Curiosity mode: increased responsiveness on one side
        this.stateManager.onCuriosityStart((x, y) => {
            this.flower.setCuriositySide(x, y);
        });

        this.stateManager.onCuriosityEnd(() => {
            this.flower.resetCuriosity();
        });

        // Night shift: transition to dusk
        this.stateManager.onNightShift((progress) => {
            this.background.setNightMode(progress);
            this.particles.setNightMode(progress > 0.3);

            if (progress > 0.5 && !this.audio.nightDrone) {
                this.audio.addNightLayer();
            }
        });
    }

    setupInputCallbacks() {
        // Cursor move
        this.input.onMove((x, y, velocity) => {
            this.wind.update(16, x, y);
            this.pollenTrail.updateCursor(x, y);
            this.particles.updateCursor(x, y);

            // Handle flower hover
            if (this.entrance.getIsComplete()) {
                const hover = this.flower.handleHover(x, y);

                if (hover.petal || hover.center) {
                    this.pollenTrail.activate();

                    // Play hover sound occasionally
                    if (Math.random() < 0.05 && velocity > 2) {
                        this.audio.playHoverBell(this.input.getPan());
                    }
                } else {
                    this.pollenTrail.deactivate();
                }
            }
        });

        // Click
        this.input.onClick((x, y, velocity) => {
            if (!this.entrance.getIsComplete()) return;

            const click = this.flower.handleClick(x, y);

            if (click.center) {
                // Center click
                this.audio.playCenterPad();
                this.particles.spawnPollenBurst(
                    this.flower.flowerX,
                    this.flower.flowerY,
                    20
                );
                this.stateManager.recordInteraction('centerClick', x, y);
            } else if (click.petal) {
                // Petal click
                this.audio.playClickChord(this.input.getPan());
                this.stateManager.recordInteraction('petalClick', x, y);
            }
        });
    }

    resize() {
        // Limit pixel ratio on mobile for performance
        let dpr = this.capabilities.pixelRatio;
        if (this.capabilities.isMobile) {
            dpr = Math.min(dpr, 1.5);
        }

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.ctx.scale(dpr, dpr);

        // Resize modules
        if (this.background) this.background.resize(this.width, this.height);
        if (this.wind) this.wind.resize(this.width, this.height);
        if (this.particles) this.particles.resize(this.width, this.height);
        if (this.pollenTrail) this.pollenTrail.resize(this.width, this.height);

        // Reposition flower
        if (this.flower) {
            const flowerX = this.width * 0.5;
            const flowerY = this.height * 0.85;
            this.flower.resize(flowerX, flowerY);
        }

        // Resize bee system
        if (this.bees) this.bees.resize(this.width, this.height);
    }

    animate(currentTime) {
        if (!this.isRunning) return;

        // FPS limiting for mobile
        const elapsed = currentTime - this.lastFrameTime;

        if (elapsed < this.frameInterval) {
            requestAnimationFrame(this.animate);
            return;
        }

        this.lastFrameTime = currentTime - (elapsed % this.frameInterval);

        const deltaTime = Math.min(50, currentTime - this.lastTime);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.drawFrame(deltaTime);

        this.frameCount++;
        requestAnimationFrame(this.animate);
    }

    update(deltaTime) {
        // Update entrance animation
        this.entrance.update();

        // Update state manager
        this.stateManager.update();

        // Get wind
        const wind = this.wind.getWindAt(this.flower?.flowerX || this.width / 2, this.flower?.flowerY || this.height / 2);

        // Update wind field
        this.wind.update(deltaTime, this.input.x, this.input.y);

        // Update background
        this.background.update(deltaTime, this.input.x, this.input.y, this.wind.getStrength());

        // Update particles
        this.particles.update(deltaTime, wind);

        // Update pollen trail
        this.pollenTrail.update(deltaTime);

        // Update flower
        if (this.flower) {
            this.flower.update(deltaTime, wind);

            // Sync with audio
            this.flower.syncWithAudio(this.audio.getIntensity());

            // Update bee system with flower position
            if (this.bees && this.entrance.getIsComplete()) {
                const flowerPos = this.flower.getFlowerHeadPosition();
                this.bees.updateFlowerPosition(flowerPos.x, flowerPos.y);
                this.bees.update(deltaTime);
            }
        }
    }

    drawFrame(deltaTime) {
        const ctx = this.ctx;

        // Clear
        ctx.clearRect(0, 0, this.width, this.height);

        // Draw background
        this.background.draw(this.flower?.flowerX, this.flower?.flowerY);

        // Draw back particles (dust)
        this.particles.draw();

        // Draw flower
        if (this.flower) {
            this.flower.draw(ctx);
        }

        // Draw pollen trail on top
        this.pollenTrail.draw();

        // Draw bees on top of everything
        if (this.bees && this.entrance.getIsComplete()) {
            this.bees.draw();
        }
    }
}

// Start application
const app = new DaisyExperience();
app.init();
