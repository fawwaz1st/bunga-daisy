/**
 * Color utilities - pre-parsed, no regex in hot paths
 */
import { Utils } from '../config.js';

export class ColorUtils {
  static #cache = new Map<string, { r: number; g: number; b: number }>();

  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (this.#cache.has(hex)) return this.#cache.get(hex)!;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const rgb = result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
    this.#cache.set(hex, rgb);
    return rgb;
  }

  static hexToRgba(hex: string, alpha: number): string {
    if (typeof hex === 'string' && hex.startsWith('rgb')) {
      const m = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
    }
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  static lerpColor(c1: string, c2: string, t: number): string {
    const a = this.hexToRgb(c1);
    const b = this.hexToRgb(c2);
    const r = Math.round(Utils.lerp(a.r, b.r, t));
    const g = Math.round(Utils.lerp(a.g, b.g, t));
    const bl = Math.round(Utils.lerp(a.b, b.b, t));
    return `rgb(${r}, ${g}, ${bl})`;
  }

  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
  }
}
