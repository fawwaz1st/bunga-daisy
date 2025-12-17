/**
 * Stem Module - ENHANCED PHYSICS VERSION
 * Multi-segment spring chain with verlet integration
 * More natural, physically-based sway
 */

import { COLORS, PHYSICS, Utils, Easing } from '../config.js';

export class Stem {
    constructor(baseX, baseY, height) {
        this.baseX = baseX;
        this.baseY = baseY;
        this.height = height;

        // Number of segments for physics simulation
        this.segmentCount = 8;
        this.segments = [];
        this.initSegments();

        // Physics properties
        this.stiffness = 0.4;           // Spring stiffness
        this.damping = 0.88;            // Velocity damping
        this.gravity = 0.01;            // Slight upward bias
        this.windResponse = 0.15;       // How much wind affects it

        // Overall angle (for flower positioning)
        this.angle = 0;
        this.angularVelocity = 0;

        // Secondary motion
        this.secondaryWave = 0;
        this.waveSpeed = 2.5;

        // Leaves with physics
        this.leaves = [
            {
                segmentIndex: 2,
                size: 18,
                baseAngle: -0.5,
                angle: -0.5,
                angleVelocity: 0,
                unfold: 0,
                side: -1
            },
            {
                segmentIndex: 4,
                size: 14,
                baseAngle: 0.6,
                angle: 0.6,
                angleVelocity: 0,
                unfold: 0,
                side: 1
            },
            {
                segmentIndex: 5,
                size: 10,
                baseAngle: -0.4,
                angle: -0.4,
                angleVelocity: 0,
                unfold: 0,
                side: -1
            }
        ];

        // Growth animation
        this.growthProgress = 0;
        this.visible = false;

        // Slow-mo effect
        this.slowMoActive = false;
        this.slowMoProgress = 0;
    }

    initSegments() {
        this.segments = [];
        const segmentHeight = this.height / this.segmentCount;

        for (let i = 0; i <= this.segmentCount; i++) {
            this.segments.push({
                x: 0,
                y: -i * segmentHeight,
                prevX: 0,
                prevY: -i * segmentHeight,
                velocityX: 0,
                velocityY: 0,
                // Flexibility increases toward top
                flexibility: 0.3 + (i / this.segmentCount) * 0.7
            });
        }
    }

    startGrowth() {
        this.visible = true;
        this.growthProgress = 0;
    }

    getFlowerPosition() {
        if (this.segments.length === 0) {
            return { x: this.baseX, y: this.baseY - this.height, angle: 0 };
        }

        const topSegment = this.segments[this.segments.length - 1];
        const prevSegment = this.segments[this.segments.length - 2];

        // Calculate angle from last two segments
        const dx = topSegment.x - (prevSegment ? prevSegment.x : 0);
        const dy = topSegment.y - (prevSegment ? prevSegment.y : topSegment.y + 10);
        const tipAngle = Math.atan2(dx, -dy);

        return {
            x: this.baseX + topSegment.x * this.growthProgress,
            y: this.baseY + topSegment.y * this.growthProgress,
            angle: tipAngle * 0.6
        };
    }

    update(deltaTime, wind) {
        if (!this.visible) return;

        const dt = deltaTime * 0.001;
        const time = performance.now() * 0.001;

        // Growth animation with easing
        if (this.growthProgress < 1) {
            const growthSpeed = 0.35;
            this.growthProgress += dt * growthSpeed;
            this.growthProgress = Math.min(1, this.growthProgress);

            // Unfold leaves progressively
            this.leaves.forEach((leaf, i) => {
                const threshold = 0.3 + (leaf.segmentIndex / this.segmentCount) * 0.4;
                if (this.growthProgress > threshold) {
                    const unfoldProgress = (this.growthProgress - threshold) / 0.25;
                    leaf.unfold = Easing.cubicOut(Math.min(1, unfoldProgress));
                }
            });
        }

        // Secondary wave for organic motion
        this.secondaryWave = Math.sin(time * this.waveSpeed) * 0.02;

        // Slow-mo effect decay
        if (this.slowMoActive) {
            this.slowMoProgress += dt;
            if (this.slowMoProgress > 3) {
                this.slowMoActive = false;
                this.slowMoProgress = 0;
            }
        }

        // ═══════════════════════════════════════════════════════
        // VERLET INTEGRATION PHYSICS
        // ═══════════════════════════════════════════════════════

        // Calculate number of active segments based on growth
        const activeSegments = Math.ceil(this.segmentCount * this.growthProgress);

        // Apply forces to each segment
        for (let i = 1; i <= activeSegments; i++) {
            const seg = this.segments[i];
            const heightRatio = i / this.segmentCount;

            // Wind force (stronger at top)
            const windForce = wind.x * this.windResponse * seg.flexibility;
            const windForceY = wind.y * this.windResponse * 0.3;

            // Natural sway (phase offset per segment)
            const swayPhase = time * 1.2 + i * 0.3;
            const naturalSway = Math.sin(swayPhase) * 0.3 * seg.flexibility;

            // Slow-mo impulse
            let slowMoForce = 0;
            if (this.slowMoActive) {
                const envelope = Math.exp(-this.slowMoProgress * 0.8);
                slowMoForce = Math.sin(this.slowMoProgress * 4) * envelope * 3 * heightRatio;
            }

            // Calculate new position using Verlet
            const vx = (seg.x - seg.prevX) * this.damping;
            const vy = (seg.y - seg.prevY) * this.damping;

            seg.prevX = seg.x;
            seg.prevY = seg.y;

            seg.x += vx + (windForce + naturalSway + slowMoForce) * dt * 60;
            seg.y += vy + (windForceY - this.gravity) * dt * 60;
        }

        // Constraint: maintain segment distances (stiff rod constraint)
        const segmentLength = this.height / this.segmentCount;

        for (let iteration = 0; iteration < 3; iteration++) {
            for (let i = 1; i <= activeSegments; i++) {
                const seg = this.segments[i];
                const prevSeg = this.segments[i - 1];

                const dx = seg.x - prevSeg.x;
                const dy = seg.y - prevSeg.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

                const diff = (segmentLength - distance) / distance;
                const offsetX = dx * diff * 0.5;
                const offsetY = dy * diff * 0.5;

                // Apply constraint (first segment is fixed)
                if (i > 0) {
                    seg.x += offsetX * this.stiffness;
                    seg.y += offsetY * this.stiffness;
                }

                // Spring force toward upright position
                const uprightForce = -seg.x * 0.02 * (1 - seg.flexibility * 0.5);
                seg.x += uprightForce;
            }
        }

        // First segment anchored
        this.segments[0].x = 0;
        this.segments[0].y = 0;

        // Calculate overall angle for flower
        const topSeg = this.segments[activeSegments];
        this.angle = Math.atan2(topSeg.x, -topSeg.y);

        // Update leaf physics
        this.leaves.forEach(leaf => {
            if (leaf.unfold <= 0) return;

            const seg = this.segments[Math.min(leaf.segmentIndex, activeSegments)];
            const segVelocity = seg.x - seg.prevX;

            // Leaf reacts to stem movement
            const targetAngle = leaf.baseAngle + segVelocity * 0.5 + this.secondaryWave * leaf.side;
            const angleDiff = targetAngle - leaf.angle;
            leaf.angleVelocity += angleDiff * 0.15;
            leaf.angleVelocity *= 0.85;
            leaf.angle += leaf.angleVelocity;
        });
    }

    triggerSlowSway() {
        this.slowMoActive = true;
        this.slowMoProgress = 0;

        // Give initial impulse
        const topHalf = Math.floor(this.segmentCount / 2);
        for (let i = topHalf; i <= this.segmentCount; i++) {
            const seg = this.segments[i];
            seg.x += (Math.random() - 0.5) * 5;
        }
    }

    draw(ctx) {
        if (!this.visible || this.growthProgress <= 0) return;

        ctx.save();
        ctx.translate(this.baseX, this.baseY);

        const activeSegments = Math.ceil(this.segmentCount * this.growthProgress);

        // Draw stem as smooth curve through segments
        ctx.beginPath();
        ctx.moveTo(0, 0);

        // Use cardinal spline for smooth curve
        const points = [];
        for (let i = 0; i <= activeSegments; i++) {
            const seg = this.segments[i];
            const progress = i <= activeSegments ? 1 : (this.growthProgress * this.segmentCount - i + 1);
            points.push({
                x: seg.x * Math.min(1, progress),
                y: seg.y * this.growthProgress
            });
        }

        // Draw cardinal spline
        if (points.length >= 2) {
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[Math.max(0, i - 1)];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[Math.min(points.length - 1, i + 2)];

                // Catmull-Rom to Bezier conversion
                const tension = 0.5;
                const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
                const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
                const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
                const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            }
        }

        // Gradient for stem
        const gradient = ctx.createLinearGradient(0, 0, 0, -this.height * this.growthProgress);
        gradient.addColorStop(0, COLORS.stemDark);
        gradient.addColorStop(0.3, COLORS.stemGreen);
        gradient.addColorStop(0.7, COLORS.stemGreen);
        gradient.addColorStop(1, '#9bc878');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 5 - this.growthProgress * 1.5; // Taper toward top
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw leaves
        this.leaves.forEach(leaf => {
            if (leaf.unfold <= 0) return;

            const segIdx = Math.min(leaf.segmentIndex, activeSegments);
            const seg = this.segments[segIdx];

            if (!seg) return;

            const leafX = seg.x * this.growthProgress;
            const leafY = seg.y * this.growthProgress;

            ctx.save();
            ctx.translate(leafX, leafY);
            ctx.rotate(leaf.angle);
            ctx.scale(leaf.unfold, leaf.unfold);

            // Draw leaf with gradient
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(
                leaf.size * 0.3, -leaf.size * 0.4,
                leaf.size * 0.8, -leaf.size * 0.2,
                leaf.size, 0
            );
            ctx.bezierCurveTo(
                leaf.size * 0.8, leaf.size * 0.2,
                leaf.size * 0.3, leaf.size * 0.4,
                0, 0
            );

            const leafGradient = ctx.createLinearGradient(0, 0, leaf.size, 0);
            leafGradient.addColorStop(0, COLORS.stemGreen);
            leafGradient.addColorStop(0.5, COLORS.leafGreen);
            leafGradient.addColorStop(1, '#a8c888');

            ctx.fillStyle = leafGradient;
            ctx.fill();

            // Leaf vein
            ctx.beginPath();
            ctx.moveTo(2, 0);
            ctx.quadraticCurveTo(leaf.size * 0.5, leaf.side * 1, leaf.size * 0.85, 0);
            ctx.strokeStyle = 'rgba(80, 100, 60, 0.4)';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.restore();
        });

        ctx.restore();
    }
}
