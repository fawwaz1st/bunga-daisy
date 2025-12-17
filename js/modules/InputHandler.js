/**
 * InputHandler Module
 * Handles pointer events with velocity tracking and hit detection
 */

import { Utils } from '../config.js';

export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;

        // Cursor state
        this.x = 0;
        this.y = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.velocity = 0;
        this.isDown = false;

        // Dwell tracking
        this.dwellStartTime = 0;
        this.dwellPosition = { x: 0, y: 0 };
        this.dwellThreshold = 50; // pixels

        // Touch support
        this.isTouch = false;

        // Callbacks
        this.callbacks = {
            onMove: null,
            onClick: null,
            onDwell: null
        };

        this.bindEvents();
    }

    bindEvents() {
        // Mouse events
        this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
        this.canvas.addEventListener('mousedown', this.handleDown.bind(this));
        this.canvas.addEventListener('mouseup', this.handleUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleLeave.bind(this));

        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    getCanvasPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleMove(e) {
        this.isTouch = false;
        const pos = this.getCanvasPosition(e);
        this.updatePosition(pos.x, pos.y);
    }

    handleDown(e) {
        this.isDown = true;
    }

    handleUp(e) {
        this.isDown = false;
    }

    handleClick(e) {
        const pos = this.getCanvasPosition(e);
        if (this.callbacks.onClick) {
            this.callbacks.onClick(pos.x, pos.y, this.velocity);
        }
    }

    handleLeave(e) {
        // Reset to center when leaving
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;
    }

    handleTouchStart(e) {
        this.isTouch = true;
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const pos = this.getCanvasPosition(touch);
            this.updatePosition(pos.x, pos.y);
        }
    }

    handleTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const pos = this.getCanvasPosition(touch);
            this.updatePosition(pos.x, pos.y);
        }
    }

    handleTouchEnd(e) {
        // Treat touch end as click at last position
        if (this.callbacks.onClick) {
            this.callbacks.onClick(this.x, this.y, this.velocity);
        }
    }

    updatePosition(x, y) {
        this.lastX = this.x;
        this.lastY = this.y;
        this.x = x;
        this.y = y;

        // Calculate velocity
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        this.velocity = Math.min(50, Math.hypot(dx, dy));

        // Check dwell
        const dwellDist = Utils.distance(x, y, this.dwellPosition.x, this.dwellPosition.y);
        if (dwellDist > this.dwellThreshold) {
            this.dwellStartTime = performance.now();
            this.dwellPosition = { x, y };
        }

        if (this.callbacks.onMove) {
            this.callbacks.onMove(x, y, this.velocity);
        }
    }

    // Get dwell time at current position (ms)
    getDwellTime() {
        return performance.now() - this.dwellStartTime;
    }

    // Register callbacks
    onMove(callback) { this.callbacks.onMove = callback; }
    onClick(callback) { this.callbacks.onClick = callback; }
    onDwell(callback) { this.callbacks.onDwell = callback; }

    // Get normalized position (-1 to 1, center is 0)
    getNormalizedPosition() {
        return {
            x: (this.x / this.canvas.width) * 2 - 1,
            y: (this.y / this.canvas.height) * 2 - 1
        };
    }

    // Get pan value for audio (-1 to 1)
    getPan() {
        return Utils.clamp((this.x / this.canvas.width) * 2 - 1, -1, 1);
    }
}
