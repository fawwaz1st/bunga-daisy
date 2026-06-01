/**
 * ProceduralFlowerParams — unique flower configuration per reload
 */
import { SeedRandom } from '../utils/SeedRandom.js';

export interface FlowerParams {
  seed: number;
  petalCount: number;
  petalLayers: number;
  baseRadius: number;
  hueBase: number;
  hueRange: number;
  saturationBase: number;
  lightnessBase: number;
  petalLengthVar: number;
  petalWidthVar: number;
  asymmetry: number;
  curvature: number;
  centerSize: number;
  centerHue: number;
  centerPattern: 'dots' | 'spiral' | 'rings' | 'fibonacci';
  stemCurve: number;
  stemColor: string;
  leafCount: number;
  leafShape: 'oval' | 'pointed' | 'round' | 'heart';
  hasInnerPetals: boolean;
  innerPetalRatio: number;
  pollenDensity: number;
}

export function generateFlowerParams(): FlowerParams {
  const rng = new SeedRandom();
  const patterns: Array<'dots' | 'spiral' | 'rings' | 'fibonacci'> = ['dots', 'spiral', 'rings', 'fibonacci'];
  const leafShapes: Array<'oval' | 'pointed' | 'round' | 'heart'> = ['oval', 'pointed', 'round', 'heart'];
  const stemColors = ['#8ba878', '#7a9a68', '#6b8858', '#9bb888', '#a8c090'];

  const hueBase = rng.int(30, 70); // warm whites to yellows
  const hasInner = rng.boolean(0.4);

  return {
    seed: rng.seed,
    petalCount: rng.int(24, 48),
    petalLayers: rng.int(1, hasInner ? 2 : 1),
    baseRadius: rng.range(0.08, 0.16),
    hueBase,
    hueRange: rng.range(4, 18),
    saturationBase: rng.range(2, 12),
    lightnessBase: rng.range(94, 99),
    petalLengthVar: rng.range(0.75, 1.35),
    petalWidthVar: rng.range(0.7, 1.4),
    asymmetry: rng.range(0, 0.15),
    curvature: rng.range(0.3, 0.9),
    centerSize: rng.range(0.18, 0.32),
    centerHue: rng.int(40, 60),
    centerPattern: rng.pick(patterns),
    stemCurve: rng.range(0.1, 0.5),
    stemColor: rng.pick(stemColors),
    leafCount: rng.int(2, 5),
    leafShape: rng.pick(leafShapes),
    hasInnerPetals: hasInner,
    innerPetalRatio: hasInner ? rng.range(0.5, 0.75) : 0,
    pollenDensity: rng.range(0.5, 1.5)
  };
}
