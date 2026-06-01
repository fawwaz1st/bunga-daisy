/**
 * Fast 2D noise using sin composition (no permutation table needed)
 */
export const Noise = {
  wind(x: number, y: number, time: number): number {
    return Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 - time * 0.5) * 0.5
         + Math.sin(x * 0.02 - time * 1.3) * 0.25;
  },

  simplex2D(x: number, y: number): number {
    // Simple approximation for organic textures
    return Math.sin(x * 1.2 + y * 0.7) * 0.5 + Math.sin(x * 0.3 - y * 1.1) * 0.5;
  }
};
