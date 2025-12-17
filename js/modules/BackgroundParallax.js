/**
 * BackgroundParallax Module - PERFECT DAY/NIGHT CYCLE
 * Seamless looping day-night, fluffy clouds, responsive design
 */

import { COLORS, PHYSICS, TIMING, Utils, Easing } from '../config.js';

export class BackgroundParallax {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;

        this.time = 0;

        // Elements
        this.stars = [];
        this.clouds = [];
        this.hills = [];
        this.trees = [];
        this.bushes = [];
        this.flowers = [];
        this.grasses = [];
        this.fireflies = [];

        this.initAllElements();

        // Day-night cycle (0 to 1, loops seamlessly)
        // 0.0/1.0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
        this.dayProgress = 0.25; // Start at sunrise
        this.cycleDuration = 90; // 90 seconds per full cycle

        // Parallax camera
        this.offsetX = 0;
        this.offsetY = 0;

        // Responsive scaling
        this.scale = Math.min(width, height) / 800;
    }

    initAllElements() {
        this.generateStars();
        this.generateHills();
        this.generateClouds();
        this.generateTrees();
        this.generateBushes();
        this.generateFlowers();
        this.generateGrasses();
        this.generateFireflies();
    }

    generateStars() {
        this.stars = [];
        const count = 60;

        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random() * 0.45,
                size: Utils.randomRange(0.5, 1.8),
                twinklePhase: Utils.randomRange(0, Math.PI * 2),
                twinkleSpeed: Utils.randomRange(1.5, 3.5)
            });
        }
    }

    generateHills() {
        this.hills = [];

        const configs = [
            { baseY: 0.44, amplitude: 0.08, hue: 95, sat: 25, lit: 45, parallax: 0.008 },
            { baseY: 0.52, amplitude: 0.06, hue: 100, sat: 30, lit: 40, parallax: 0.012 },
            { baseY: 0.58, amplitude: 0.05, hue: 105, sat: 35, lit: 35, parallax: 0.016 }
        ];

        configs.forEach(config => {
            const points = [];
            const segments = 12;

            for (let i = 0; i <= segments; i++) {
                const nx = i / segments;
                const wave1 = Math.sin(nx * Math.PI * 3 + config.baseY * 15) * config.amplitude * 0.6;
                const wave2 = Math.sin(nx * Math.PI * 5) * config.amplitude * 0.4;
                points.push({ nx, ny: config.baseY - wave1 - wave2 });
            }

            this.hills.push({ points, ...config });
        });
    }

    generateClouds() {
        this.clouds = [];
        const count = 7;

        for (let i = 0; i < count; i++) {
            // Generate fluffy cloud with multiple puffs
            const puffs = [];
            const puffCount = Utils.randomInt(4, 7);
            const baseWidth = Utils.randomRange(0.08, 0.14);

            for (let j = 0; j < puffCount; j++) {
                puffs.push({
                    offsetX: (j - puffCount / 2) * baseWidth * 0.5,
                    offsetY: Math.sin(j * 1.2) * 0.008,
                    radius: baseWidth * (0.25 + Math.random() * 0.2)
                });
            }

            this.clouds.push({
                x: Utils.randomRange(-0.1, 1.1),
                y: Utils.randomRange(0.06, 0.18),
                puffs: puffs,
                speed: Utils.randomRange(0.003, 0.007),
                opacity: Utils.randomRange(0.65, 0.9)
            });
        }
    }

    generateTrees() {
        this.trees = [];
        const count = Math.max(8, Math.floor(this.width / 80));

        for (let i = 0; i < count; i++) {
            const depth = Utils.randomRange(0, 1);
            this.trees.push({
                nx: Utils.randomRange(0, 1),
                height: Utils.randomRange(0.06, 0.1) * (1 - depth * 0.3),
                width: Utils.randomRange(0.025, 0.045) * (1 - depth * 0.3),
                type: Utils.randomInt(0, 4),
                parallax: 0.015 + depth * 0.03,
                swayPhase: Utils.randomRange(0, Math.PI * 2),
                opacity: 0.3 + depth * 0.25
            });
        }

        this.trees.sort((a, b) => a.parallax - b.parallax);
    }

    generateBushes() {
        this.bushes = [];
        const count = Math.max(6, Math.floor(this.width / 100));

        for (let i = 0; i < count; i++) {
            this.bushes.push({
                nx: Utils.randomRange(0, 1),
                ny: Utils.randomRange(0.78, 0.85),
                width: Utils.randomRange(0.025, 0.05),
                height: Utils.randomRange(0.015, 0.028),
                hue: Utils.randomRange(90, 125),
                swayPhase: Utils.randomRange(0, Math.PI * 2)
            });
        }
    }

    generateFlowers() {
        this.flowers = [];
        const count = Math.max(10, Math.floor(this.width / 45));

        for (let i = 0; i < count; i++) {
            this.flowers.push({
                nx: Utils.randomRange(0, 1),
                ny: Utils.randomRange(0.83, 0.94),
                size: Utils.randomRange(0.006, 0.012),
                color: ['#fff8f0', '#f8f0ff', '#f0fff8', '#fffff0', '#ffe8f0'][Utils.randomInt(0, 5)],
                swayPhase: Utils.randomRange(0, Math.PI * 2),
                stemHeight: Utils.randomRange(0.02, 0.04),
                petals: Utils.randomInt(4, 7)
            });
        }
    }

    generateGrasses() {
        this.grasses = [];
        const count = Math.max(100, Math.floor(this.width / 4));

        for (let i = 0; i < count; i++) {
            this.grasses.push({
                nx: Utils.randomRange(0, 1),
                height: Utils.randomRange(0.04, 0.08),
                thickness: Utils.randomRange(1.2, 2),
                phase: Utils.randomRange(0, Math.PI * 2),
                hue: Utils.randomRange(85, 120),
                saturation: Utils.randomRange(40, 55),
                lightness: Utils.randomRange(40, 52)
            });
        }
    }

    generateFireflies() {
        this.fireflies = [];
        const count = 15;

        for (let i = 0; i < count; i++) {
            this.fireflies.push({
                nx: Utils.randomRange(0, 1),
                ny: Utils.randomRange(0.5, 0.88),
                phase: Utils.randomRange(0, Math.PI * 2),
                speed: Utils.randomRange(0.02, 0.04),
                glowPhase: Utils.randomRange(0, Math.PI * 2)
            });
        }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.scale = Math.min(width, height) / 800;
        this.initAllElements();
    }

    update(deltaTime, cursorX, cursorY, windStrength) {
        this.time += deltaTime * 0.001;

        // Day-night cycle - seamless loop
        this.dayProgress += deltaTime / (this.cycleDuration * 1000);
        if (this.dayProgress >= 1) this.dayProgress -= 1;

        // Parallax camera
        const targetX = (cursorX - this.width / 2) * 0.02;
        const targetY = (cursorY - this.height / 2) * 0.01;
        this.offsetX = Utils.lerp(this.offsetX, targetX, 0.03);
        this.offsetY = Utils.lerp(this.offsetY, targetY, 0.03);

        // Move clouds
        this.clouds.forEach(cloud => {
            cloud.x += cloud.speed * deltaTime * 0.001;
            if (cloud.x > 1.2) cloud.x = -0.2;
        });

        // Update fireflies
        this.fireflies.forEach(ff => {
            ff.nx += Math.sin(this.time * ff.speed * 8 + ff.phase) * 0.0003;
            ff.ny += Math.cos(this.time * ff.speed * 6 + ff.phase) * 0.0002;
            ff.glowPhase += deltaTime * 0.004;

            if (ff.nx < 0) ff.nx = 1;
            if (ff.nx > 1) ff.nx = 0;
        });
    }

    setNightMode(progress) {
        // This now just accelerates toward evening, doesn't break loop
        if (progress > 0) {
            const target = 0.75 + progress * 0.15;
            this.dayProgress = Utils.lerp(this.dayProgress, target, 0.003);
        }
    }

    // Get darkness level (0 = full day, 1 = full night)
    getDarkness() {
        const p = this.dayProgress;

        // Smooth sinusoidal day-night cycle
        // p=0 midnight, p=0.25 sunrise, p=0.5 noon, p=0.75 sunset
        const dayLight = Math.sin(p * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
        return 1 - dayLight;
    }

    // Get sun altitude (-1 to 1, negative = below horizon)
    getSunAltitude() {
        const p = this.dayProgress;
        return Math.sin(p * Math.PI * 2 - Math.PI / 2);
    }

    // ═══════════════════════════════════════════════════════
    // DRAWING
    // ═══════════════════════════════════════════════════════

    draw(flowerX, flowerY) {
        this.drawSky();
        this.drawStars();
        this.drawSunMoon();
        this.drawClouds();
        this.drawHills();
        this.drawTrees();
        this.drawBushes();
        this.drawFlowers();
        this.drawGrasses();
        this.drawFireflies();
        this.drawVolumetricLight(flowerX, flowerY);
    }

    drawSky() {
        const ctx = this.ctx;
        const p = this.dayProgress;
        const darkness = this.getDarkness();

        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);

        // Smooth 4-phase sky (dawn, day, dusk, night)
        if (p < 0.2) {
            // Night → Dawn (0 - 0.2)
            const t = p / 0.2;
            gradient.addColorStop(0, this.lerpColor('#0a1525', '#607090', t));
            gradient.addColorStop(0.35, this.lerpColor('#152035', '#d89060', t));
            gradient.addColorStop(0.6, this.lerpColor('#202830', '#f0a070', t));
            gradient.addColorStop(1, this.lerpColor('#252830', '#80a080', t));
        } else if (p < 0.4) {
            // Dawn → Day (0.2 - 0.4)
            const t = (p - 0.2) / 0.2;
            gradient.addColorStop(0, this.lerpColor('#607090', '#87ceeb', t));
            gradient.addColorStop(0.35, this.lerpColor('#d89060', '#a8d8f0', t));
            gradient.addColorStop(0.6, this.lerpColor('#f0a070', '#b8e0d8', t));
            gradient.addColorStop(1, this.lerpColor('#80a080', '#c0dcc0', t));
        } else if (p < 0.6) {
            // Day (0.4 - 0.6)
            gradient.addColorStop(0, '#87ceeb');
            gradient.addColorStop(0.4, '#a8d8f0');
            gradient.addColorStop(1, '#c0dcc0');
        } else if (p < 0.8) {
            // Day → Dusk (0.6 - 0.8)
            const t = (p - 0.6) / 0.2;
            gradient.addColorStop(0, this.lerpColor('#87ceeb', '#4a5080', t));
            gradient.addColorStop(0.25, this.lerpColor('#a8d8f0', '#906070', t));
            gradient.addColorStop(0.5, this.lerpColor('#b0dce0', '#d07050', t));
            gradient.addColorStop(0.7, this.lerpColor('#c0dcc0', '#b04530', t));
            gradient.addColorStop(1, this.lerpColor('#b0d0b0', '#504040', t));
        } else {
            // Dusk → Night (0.8 - 1.0)
            const t = (p - 0.8) / 0.2;
            gradient.addColorStop(0, this.lerpColor('#4a5080', '#0a1525', t));
            gradient.addColorStop(0.35, this.lerpColor('#906070', '#152035', t));
            gradient.addColorStop(0.6, this.lerpColor('#d07050', '#202830', t));
            gradient.addColorStop(1, this.lerpColor('#504040', '#252830', t));
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    drawStars() {
        const darkness = this.getDarkness();
        if (darkness < 0.35) return;

        const ctx = this.ctx;
        const alpha = Math.min(1, (darkness - 0.35) / 0.35);

        this.stars.forEach(star => {
            const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinklePhase);
            const brightness = 0.4 + twinkle * 0.6;

            ctx.fillStyle = `rgba(255, 255, 245, ${alpha * brightness * 0.9})`;
            ctx.beginPath();
            ctx.arc(star.x * this.width, star.y * this.height, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawSunMoon() {
        const ctx = this.ctx;
        const sunAlt = this.getSunAltitude();
        const horizonY = this.height * 0.55;

        // Sun position
        const sunY = horizonY - sunAlt * this.height * 0.45;
        const sunX = this.width * 0.5 + Math.cos(this.dayProgress * Math.PI * 2) * this.width * 0.35;

        // Only draw sun if above horizon
        if (sunAlt > -0.1) {
            const radius = 25 * this.scale + 5;
            const alpha = Math.min(1, (sunAlt + 0.1) / 0.3);

            // Sun color based on altitude
            let coreColor, glowColor;
            if (sunAlt < 0.2) {
                coreColor = '#ffb060';
                glowColor = '#ff7030';
            } else if (sunAlt < 0.6) {
                coreColor = this.lerpColor('#ffb060', '#fffff0', (sunAlt - 0.2) / 0.4);
                glowColor = this.lerpColor('#ff7030', '#fff8c0', (sunAlt - 0.2) / 0.4);
            } else {
                coreColor = '#fffff0';
                glowColor = '#fff8c0';
            }

            // Glow
            const glowRadius = radius * 3.5;
            const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowRadius);
            glow.addColorStop(0, this.hexToRgba(glowColor, 0.4 * alpha));
            glow.addColorStop(0.5, this.hexToRgba(glowColor, 0.1 * alpha));
            glow.addColorStop(1, 'rgba(255, 200, 100, 0)');

            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(sunX, sunY, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Core
            const core = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius);
            core.addColorStop(0, coreColor);
            core.addColorStop(0.85, glowColor);
            core.addColorStop(1, this.hexToRgba(glowColor, 0.6 * alpha));

            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Moon (opposite to sun)
        const moonAlt = -sunAlt;
        const moonY = horizonY - moonAlt * this.height * 0.4;
        const moonX = this.width * 0.5 - Math.cos(this.dayProgress * Math.PI * 2) * this.width * 0.3;

        if (moonAlt > -0.1 && this.getDarkness() > 0.35) {
            const moonRadius = 18 * this.scale + 4;
            const moonAlpha = Math.min(1, (moonAlt + 0.1) / 0.3) * Math.min(1, (this.getDarkness() - 0.35) / 0.3);

            // Moon glow
            const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 2.5);
            moonGlow.addColorStop(0, `rgba(200, 210, 230, ${0.25 * moonAlpha})`);
            moonGlow.addColorStop(1, 'rgba(200, 210, 230, 0)');

            ctx.fillStyle = moonGlow;
            ctx.beginPath();
            ctx.arc(moonX, moonY, moonRadius * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Moon
            ctx.fillStyle = `rgba(235, 240, 250, ${moonAlpha})`;
            ctx.beginPath();
            ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawClouds() {
        const ctx = this.ctx;
        const darkness = this.getDarkness();
        const cloudBrightness = 1 - darkness * 0.6;

        this.clouds.forEach(cloud => {
            const baseX = cloud.x * this.width;
            const baseY = cloud.y * this.height;

            ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity * cloudBrightness})`;

            // Draw fluffy cloud with multiple overlapping ellipses
            cloud.puffs.forEach(puff => {
                const px = baseX + puff.offsetX * this.width;
                const py = baseY + puff.offsetY * this.height;
                const pr = puff.radius * this.width;

                ctx.beginPath();
                ctx.ellipse(px, py, pr, pr * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    drawHills() {
        const ctx = this.ctx;
        const darkness = this.getDarkness();

        this.hills.forEach(hill => {
            const offsetX = this.offsetX * hill.parallax * 25;

            ctx.beginPath();
            ctx.moveTo(-50, this.height);

            hill.points.forEach((point, i) => {
                const x = point.nx * this.width * 1.2 - this.width * 0.1 + offsetX;
                const y = point.ny * this.height;

                if (i === 0) {
                    ctx.lineTo(x, y);
                } else {
                    const prev = hill.points[i - 1];
                    const prevX = prev.nx * this.width * 1.2 - this.width * 0.1 + offsetX;
                    const cpX = (prevX + x) / 2;
                    const cpY = (prev.ny * this.height + y) / 2;
                    ctx.quadraticCurveTo(prevX, prev.ny * this.height, cpX, cpY);
                }
            });

            ctx.lineTo(this.width + 50, this.height);
            ctx.closePath();

            const dimLit = hill.lit * (1 - darkness * 0.4);
            ctx.fillStyle = `hsla(${hill.hue}, ${hill.sat}%, ${dimLit}%, 0.75)`;
            ctx.fill();
        });
    }

    drawTrees() {
        const ctx = this.ctx;
        const baseY = this.height * 0.77;
        const darkness = this.getDarkness();

        this.trees.forEach(tree => {
            const offsetX = this.offsetX * tree.parallax * 35;
            const sway = Math.sin(this.time * 0.5 + tree.swayPhase) * 2;
            const x = tree.nx * this.width + offsetX + sway;
            const h = tree.height * this.height;
            const w = tree.width * this.width;

            const dimFactor = 1 - darkness * 0.45;
            const alpha = tree.opacity * dimFactor;

            ctx.fillStyle = `rgba(45, 65, 40, ${alpha})`;

            if (tree.type === 0) {
                ctx.fillRect(x - 2, baseY - h * 0.35, 4, h * 0.35);
                ctx.beginPath();
                ctx.arc(x + sway * 0.2, baseY - h * 0.55, w * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (tree.type === 1) {
                ctx.fillRect(x - 2, baseY - h * 0.25, 4, h * 0.25);
                ctx.beginPath();
                ctx.moveTo(x + sway * 0.3, baseY - h);
                ctx.lineTo(x - w * 0.4, baseY - h * 0.25);
                ctx.lineTo(x + w * 0.4, baseY - h * 0.25);
                ctx.closePath();
                ctx.fill();
            } else if (tree.type === 2) {
                ctx.beginPath();
                ctx.ellipse(x + sway * 0.2, baseY - h * 0.5, w * 0.15, h * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(x - 3, baseY - h * 0.38, 6, h * 0.38);
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI + 0.5;
                    const cx = x + Math.cos(angle) * w * 0.2 + sway * 0.2;
                    const cy = baseY - h * 0.6 + Math.sin(angle) * h * 0.1;
                    ctx.beginPath();
                    ctx.arc(cx, cy, w * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
    }

    drawBushes() {
        const ctx = this.ctx;
        const darkness = this.getDarkness();

        this.bushes.forEach(bush => {
            const sway = Math.sin(this.time * 1.1 + bush.swayPhase) * 1.5;
            const x = bush.nx * this.width + this.offsetX * 0.06 * 25 + sway;
            const y = bush.ny * this.height;
            const w = bush.width * this.width;
            const h = bush.height * this.height;

            const dimFactor = 1 - darkness * 0.4;
            ctx.fillStyle = `hsla(${bush.hue}, 38%, ${32 * dimFactor}%, 0.55)`;

            for (let i = 0; i < 3; i++) {
                const bx = x + (i - 1) * w * 0.4;
                const r = h * (0.5 + Math.sin(i * 2) * 0.15);
                ctx.beginPath();
                ctx.ellipse(bx, y, r * 1.3, r * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    drawFlowers() {
        const ctx = this.ctx;
        const darkness = this.getDarkness();

        this.flowers.forEach(flower => {
            const sway = Math.sin(this.time * 1.4 + flower.swayPhase) * 2.5;
            const x = flower.nx * this.width + this.offsetX * 0.08 * 25;
            const y = flower.ny * this.height;
            const size = flower.size * this.width;
            const stemH = flower.stemHeight * this.height;

            const dimFactor = 1 - darkness * 0.35;

            // Stem
            ctx.strokeStyle = `hsla(100, 42%, ${38 * dimFactor}%, 0.55)`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, y + stemH);
            ctx.quadraticCurveTo(x + sway * 0.25, y + stemH * 0.5, x + sway, y);
            ctx.stroke();

            // Petals
            const fx = x + sway;
            ctx.fillStyle = this.hexToRgba(flower.color, 0.8 * dimFactor);

            for (let i = 0; i < flower.petals; i++) {
                const angle = (i / flower.petals) * Math.PI * 2;
                const px = fx + Math.cos(angle) * size * 0.3;
                const py = y + Math.sin(angle) * size * 0.3;
                ctx.beginPath();
                ctx.ellipse(px, py, size * 0.2, size * 0.12, angle, 0, Math.PI * 2);
                ctx.fill();
            }

            // Center
            ctx.fillStyle = `rgba(255, 215, 90, ${0.75 * dimFactor})`;
            ctx.beginPath();
            ctx.arc(fx, y, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawGrasses() {
        const ctx = this.ctx;
        const baseY = this.height;
        const darkness = this.getDarkness();

        this.grasses.forEach(grass => {
            const sway = Math.sin(this.time * 1.1 + grass.phase) * 0.08;
            const x = grass.nx * this.width + this.offsetX * 0.1 * 30;
            const h = grass.height * this.height;
            const bend = sway * h;

            const dimFactor = 1 - darkness * 0.3;
            const lit = grass.lightness * dimFactor;

            ctx.strokeStyle = `hsl(${grass.hue}, ${grass.saturation}%, ${lit}%)`;
            ctx.lineWidth = grass.thickness;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(x, baseY);
            ctx.quadraticCurveTo(x + bend * 0.4, baseY - h * 0.5, x + bend, baseY - h);
            ctx.stroke();
        });
    }

    drawFireflies() {
        const darkness = this.getDarkness();
        if (darkness < 0.45) return;

        const ctx = this.ctx;
        const alpha = Math.min(1, (darkness - 0.45) / 0.35);

        this.fireflies.forEach(ff => {
            const glow = Math.sin(ff.glowPhase) * 0.5 + 0.5;
            const x = ff.nx * this.width + this.offsetX * 0.08 * 25;
            const y = ff.ny * this.height;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, 7);
            grad.addColorStop(0, `rgba(255, 255, 140, ${alpha * glow * 0.75})`);
            grad.addColorStop(0.6, `rgba(180, 255, 90, ${alpha * glow * 0.25})`);
            grad.addColorStop(1, 'rgba(180, 255, 90, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, 255, 180, ${alpha * glow})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawVolumetricLight(flowerX, flowerY) {
        const ctx = this.ctx;
        const darkness = this.getDarkness();
        const alpha = 0.055 * (1 - darkness * 0.7);
        if (alpha < 0.008) return;

        const x = flowerX || this.width * 0.5;
        const y = (flowerY || this.height * 0.5) - this.height * 0.08;
        const radius = Math.min(this.width, this.height) * 0.5;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(255, 252, 235, ${alpha})`);
        grad.addColorStop(0.45, `rgba(255, 248, 215, ${alpha * 0.45})`);
        grad.addColorStop(1, 'rgba(255, 248, 215, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    // ═══════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════

    lerpColor(color1, color2, t) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(Utils.lerp(c1.r, c2.r, t));
        const g = Math.round(Utils.lerp(c1.g, c2.g, t));
        const b = Math.round(Utils.lerp(c1.b, c2.b, t));

        return `rgb(${r}, ${g}, ${b})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    hexToRgba(hex, alpha) {
        if (typeof hex === 'string' && hex.startsWith('rgb')) {
            const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
            }
        }
        const rgb = this.hexToRgb(hex);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
}
