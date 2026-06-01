import type { Vec2 } from '../config.js';

export interface InputCallbacks {
  onMove?: (x: number, y: number, velocity: number) => void;
  onClick?: (x: number, y: number, velocity: number) => void;
  onDwell?: (x: number, y: number, duration: number) => void;
  onKeyAction?: (action: string) => void;
}

export class InputHandler {
  #canvas: HTMLCanvasElement;
  #callbacks: InputCallbacks = {};
  #abortCtrl: AbortController | null = null;
  #rect: DOMRect;
  #scale = 1;

  x = 0;
  y = 0;
  velocity = 0;
  isDown = false;

  #lastX = 0;
  #lastY = 0;
  #dwellStart = 0;
  #dwellPos: Vec2 = { x: 0, y: 0 };
  #dwellThreshold = 50;
  #pointerDownTime = 0;
  #pointerDownPos: Vec2 = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#rect = canvas.getBoundingClientRect();
    this.#bindEvents();
    this.#updateScale();
  }

  #updateScale() {
    this.#rect = this.#canvas.getBoundingClientRect();
    this.#scale = this.#canvas.width / this.#rect.width;
  }

  #bindEvents() {
    this.#abortCtrl = new AbortController();
    const opts = { signal: this.#abortCtrl.signal, passive: true };

    this.#canvas.addEventListener('pointermove', this.#onPointerMove.bind(this), opts);
    this.#canvas.addEventListener('pointerdown', this.#onPointerDown.bind(this), opts);
    this.#canvas.addEventListener('pointerup', this.#onPointerUp.bind(this), opts);
    this.#canvas.addEventListener('pointerleave', this.#onPointerLeave.bind(this), opts);
    this.#canvas.addEventListener('contextmenu', e => e.preventDefault(), opts);

    // Keyboard
    window.addEventListener('keydown', this.#onKeyDown.bind(this), opts);

    // ResizeObserver untuk update scale
    const ro = new ResizeObserver(() => this.#updateScale());
    ro.observe(this.#canvas);

    // Cleanup ResizeObserver saat dispose
    const origDispose = this.dispose.bind(this);
    this.dispose = () => { ro.disconnect(); origDispose(); };
  }

  #getCanvasPos(e: PointerEvent): Vec2 {
    return {
      x: e.clientX - this.#rect.left,
      y: e.clientY - this.#rect.top
    };
  }

  #onPointerMove(e: PointerEvent) {
    const pos = this.#getCanvasPos(e);
    this.#updatePosition(pos.x, pos.y);
    this.#callbacks.onMove?.(this.x, this.y, this.velocity);
  }

  #onPointerDown(e: PointerEvent) {
    this.isDown = true;
    this.#pointerDownTime = performance.now();
    this.#pointerDownPos = this.#getCanvasPos(e);
    (this.#canvas as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  #onPointerUp(e: PointerEvent) {
    this.isDown = false;
    const duration = performance.now() - this.#pointerDownTime;
    const pos = this.#getCanvasPos(e);
    const dist = Math.hypot(pos.x - this.#pointerDownPos.x, pos.y - this.#pointerDownPos.y);

    // Only trigger click if short duration and minimal movement (tap, not drag)
    if (duration < 500 && dist < 15) {
      this.#callbacks.onClick?.(this.x, this.y, this.velocity);
    }
  }

  #onPointerLeave() {
    this.x = this.#canvas.width / 2;
    this.y = this.#canvas.height / 2;
  }

  #onKeyDown(e: KeyboardEvent) {
    const keyMap: Record<string, string> = {
      'Enter': 'activate',
      ' ': 'activate',
      'm': 'toggleMute',
      'M': 'toggleMute',
      'r': 'reset',
      'R': 'reset',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right'
    };
    if (keyMap[e.key]) {
      e.preventDefault();
      this.#callbacks.onKeyAction?.(keyMap[e.key]);
    }
  }

  #updatePosition(x: number, y: number) {
    this.#lastX = this.x;
    this.#lastY = this.y;
    this.x = x;
    this.y = y;

    const dx = x - this.#lastX;
    const dy = y - this.#lastY;
    this.velocity = Math.min(50, Math.hypot(dx, dy));

    const dist = Math.hypot(x - this.#dwellPos.x, y - this.#dwellPos.y);
    if (dist > this.#dwellThreshold) {
      this.#dwellStart = performance.now();
      this.#dwellPos = { x, y };
    }

    const dwellTime = performance.now() - this.#dwellStart;
    if (dwellTime > 800) {
      this.#callbacks.onDwell?.(x, y, dwellTime);
    }
  }

  getNormalizedPosition(): Vec2 {
    return {
      x: (this.x / this.#canvas.width) * 2 - 1,
      y: (this.y / this.#canvas.height) * 2 - 1
    };
  }

  getPan(): number {
    return Utils.clamp((this.x / this.#canvas.width) * 2 - 1, -1, 1);
  }

  setCallbacks(cb: InputCallbacks) {
    this.#callbacks = cb;
  }

  dispose() {
    this.#abortCtrl?.abort();
    this.#callbacks = {};
  }
}

import { Utils } from '../config.js';
