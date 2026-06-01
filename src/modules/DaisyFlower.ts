/**
 * DaisyFlower with Procedural Generation
 */
import { Utils } from '../config.js';
import type { Vec2 } from '../config.js';
import type { FlowerParams } from '../utils/FlowerParams.js';
import { Stem } from './Stem.js';
import { PetalManager } from './PetalModule.js';
import { CorePulse } from './CorePulse.js';

export class DaisyFlower {
  #baseX = 0;
  #baseY = 0;
  #flowerRadius = 0;
  #stem: Stem;
  #petalManager: PetalManager | null = null;
  #core: CorePulse | null = null;
  #visible = false;
  #flowerX = 0;
  #flowerY = 0;
  #flowerAngle = 0;
  #params: FlowerParams;

  constructor(baseX: number, baseY: number, stemHeight: number, flowerRadius: number, params: FlowerParams) {
    this.#baseX = baseX; this.#baseY = baseY;
    this.#flowerRadius = flowerRadius;
    this.#params = params;
    this.#stem = new Stem(baseX, baseY, stemHeight, params);
    this.#flowerX = baseX;
    this.#flowerY = baseY - stemHeight;
  }

  resize(baseX: number, baseY: number) {
    this.#baseX = baseX; this.#baseY = baseY;
    this.#stem.resize(baseX, baseY);
  }

  startStemGrowth() { this.#visible = true; this.#stem.startGrowth(); }

  startFlowerBloom() {
    const pos = this.#stem.getFlowerPosition();
    this.#petalManager = new PetalManager(pos.x, pos.y, this.#flowerRadius, this.#params);
    this.#core = new CorePulse(pos.x, pos.y, this.#flowerRadius * this.#params.centerSize, this.#params);
    this.#petalManager.startBloom();
    setTimeout(() => this.#core?.startFill(), 900);
  }

  completeGrowth() {}

  getFlowerHeadPosition(): Vec2 { return { x: this.#flowerX, y: this.#flowerY }; }

  handleHover(x: number, y: number) {
    if (!this.#petalManager || !this.#core) return { petal: null as any, center: false };
    const centerHovered = this.#core.containsPoint(x, y);
    this.#core.setHovered(centerHovered, x, y);
    let hoveredPetal = null;
    if (!centerHovered) hoveredPetal = this.#petalManager.handleHover(x, y);
    else {
      if (this.#petalManager.getHoveredPetal()) {
        this.#petalManager.getHoveredPetal()?.setHovered(false);
        this.#petalManager.clearHovered();
      }
    }
    return { petal: hoveredPetal, center: centerHovered };
  }

  handleClick(x: number, y: number) {
    if (!this.#petalManager || !this.#core) return { petal: null as any, center: false };
    if (this.#core.containsPoint(x, y)) {
      this.triggerCenterClick();
      return { petal: null, center: true };
    }
    const clickedPetal = this.#petalManager.handleClick(x, y);
    return { petal: clickedPetal, center: false };
  }

  triggerCenterClick() {
    this.#core?.triggerClick();
    this.#petalManager?.triggerAllBloom();
    this.#stem.triggerSlowSway();
  }

  setCuriositySide(cursorX: number, cursorY: number) {
    if (!this.#petalManager) return;
    const angle = Math.atan2(cursorY - this.#flowerY, cursorX - this.#flowerX);
    this.#petalManager.setCuriositySide(angle);
  }

  resetCuriosity() { this.#petalManager?.resetCuriosity(); }
  syncWithAudio(intensity: number) { this.#core?.syncWithAudio(intensity); }

  update(deltaTime: number, wind: Vec2) {
    if (!this.#visible) return;
    this.#stem.update(deltaTime, wind);
    const pos = this.#stem.getFlowerPosition();
    this.#flowerX = pos.x; this.#flowerY = pos.y; this.#flowerAngle = pos.angle;
    this.#petalManager?.updatePosition(this.#flowerX, this.#flowerY);
    this.#petalManager?.update(deltaTime, wind);
    this.#core?.updatePosition(this.#flowerX, this.#flowerY);
    this.#core?.update(deltaTime);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.#visible) return;
    this.#stem.draw(ctx);
    if (this.#petalManager || this.#core) {
      ctx.save();
      ctx.translate(this.#flowerX, this.#flowerY);
      ctx.rotate(this.#flowerAngle);
      ctx.translate(-this.#flowerX, -this.#flowerY);
      this.#petalManager?.draw(ctx);
      this.#core?.draw(ctx);
      ctx.restore();
    }
  }

  dispose() {
    this.#core = null;
    this.#petalManager = null;
  }
}
