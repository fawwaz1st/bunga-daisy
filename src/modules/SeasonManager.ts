import { Utils } from '../config.js';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export class SeasonManager {
  #current: Season = 'spring';
  #transition = 0;
  #targetSeason: Season = 'spring';
  #leafColors: Record<Season, string[]> = {
    spring: ['#a8d8a0', '#b8e8b0', '#98c888'],
    summer: ['#7ab868', '#6aa858', '#8bc878'],
    autumn: ['#c89040', '#d0a050', '#b87830', '#e0b060'],
    winter: ['#d0d8d0', '#c8d0c8', '#e0e8e0']
  };

  get current() { return this.#current; }
  get colors() { return this.#leafColors[this.#current]; }

  setSeason(season: Season) {
    if (this.#current === season) return;
    this.#targetSeason = season;
  }

  update(deltaTime: number) {
    if (this.#current !== this.#targetSeason) {
      this.#transition += deltaTime * 0.0005;
      if (this.#transition >= 1) {
        this.#current = this.#targetSeason;
        this.#transition = 0;
      }
    }
  }

  getSkyColor(): string[] {
    switch (this.#current) {
      case 'spring': return ['#c8e0f0', '#d8f0e8'];
      case 'summer': return ['#87ceeb', '#b8e8d8'];
      case 'autumn': return ['#d0b090', '#e8d0b0'];
      case 'winter': return ['#b0c0d0', '#d0dce8'];
    }
  }

  getGrassColor(): { hue: number; sat: number; lit: number } {
    switch (this.#current) {
      case 'spring': return { hue: 100, sat: 45, lit: 50 };
      case 'summer': return { hue: 105, sat: 50, lit: 42 };
      case 'autumn': return { hue: 40, sat: 55, lit: 48 };
      case 'winter': return { hue: 120, sat: 10, lit: 75 };
    }
  }
}
