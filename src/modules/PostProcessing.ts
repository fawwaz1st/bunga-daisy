/**
 * PostProcessing - Bloom, vignette, film grain overlay
 *
 * Flicker prevention: noise texture uses SeedRandom(42) so the grain
 * pattern is identical on every redraw. Without this, the noise texture
 * regenerated on every resize used fresh Math.random() values, causing
 * the grain to visibly "shimmer" each time ResizeObserver fired.
 */
import { SeedRandom } from '../utils/SeedRandom.js';

export class PostProcessing {
  #offscreen: HTMLCanvasElement;
  #offCtx: CanvasRenderingContext2D;
  #noiseCanvas: HTMLCanvasElement | null = null;
  #lastNoiseW = 0;
  #lastNoiseH = 0;
  #noiseRng: SeedRandom = new SeedRandom(42);

  constructor(width: number, height: number) {
    this.#offscreen = document.createElement('canvas');
    this.#offCtx = this.#offscreen.getContext('2d')!;
    this.resize(width, height);
    this.#initNoise();
  }

  resize(width: number, height: number) {
    this.#offscreen.width = width;
    this.#offscreen.height = height;
    // Only re-init noise if dimensions actually changed.
    if (this.#lastNoiseW !== width || this.#lastNoiseH !== height) {
      this.#initNoise();
      this.#lastNoiseW = width;
      this.#lastNoiseH = height;
    }
  }

  #initNoise() {
    const w = 256, h = 256;
    this.#noiseCanvas = document.createElement('canvas');
    this.#noiseCanvas.width = w;
    this.#noiseCanvas.height = h;
    const ctx = this.#noiseCanvas.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (this.#noiseRng.next() - 0.5) * 24;
      img.data[i] = img.data[i+1] = img.data[i+2] = 128 + v;
      img.data[i+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  applyBloom(source: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D, intensity = 0.35) {
    const w = source.width, h = source.height;
    this.#offCtx.globalCompositeOperation = 'source-over';
    this.#offCtx.filter = 'blur(10px) brightness(1.4)';
    this.#offCtx.drawImage(source, 0, 0, w, h);
    this.#offCtx.filter = 'none';

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.globalAlpha = intensity;
    targetCtx.drawImage(this.#offscreen, 0, 0, w, h);
    targetCtx.restore();
  }

  applyVignette(ctx: CanvasRenderingContext2D, width: number, height: number, strength = 0.35) {
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.35,
      width / 2, height / 2, width * 0.9
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(15,12,8,${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  applyFilmGrain(ctx: CanvasRenderingContext2D, width: number, height: number, alpha = 0.035) {
    if (!this.#noiseCanvas) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = false;
    // Tile the noise texture across screen
    ctx.drawImage(this.#noiseCanvas, 0, 0, width, height);
    ctx.restore();
  }

  applyChromaticAberration(ctx: CanvasRenderingContext2D, width: number, height: number, intensity = 1.5) {
    if (intensity <= 0) return;
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    const out = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const rX = Math.min(width - 1, x + Math.round(intensity));
        const bX = Math.max(0, x - Math.round(intensity));
        const rI = (y * width + rX) * 4;
        const bI = (y * width + bX) * 4;
        out[i] = data[rI];       // red shift right
        out[i + 2] = data[bI + 2]; // blue shift left
      }
    }
    ctx.putImageData(new ImageData(out, width, height), 0, 0);
  }
}
