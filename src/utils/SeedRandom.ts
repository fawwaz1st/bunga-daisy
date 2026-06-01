/**
 * Seeded random generator for deterministic procedural generation
 */
export class SeedRandom {
  #seed: number;

  constructor(seed?: number) {
    this.#seed = seed ?? Math.floor(Math.random() * 2147483647);
  }

  get seed() { return this.#seed; }

  next(): number {
    this.#seed = (this.#seed * 16807 + 0) % 2147483647;
    return (this.#seed - 1) / 2147483646;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  boolean(chance = 0.5): boolean {
    return this.next() < chance;
  }
}
