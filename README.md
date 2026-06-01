# 🌼 Bunga Daisy

<p align="center">
  <img src="public/img/og-image.png" alt="Bunga Daisy Preview" width="700">
</p>

> **A calm, cinematic web experience of a single daisy flower** with
> generative music, a living parallax world, and a small ecosystem of
> weather, creatures, and random events — all rendered on Canvas 2D.

<p align="center">
  <a href="https://fawwaz1st.github.io/bunga-daisy/">
    <img src="https://img.shields.io/badge/🌼_Tap_to_Play-Open_Now!-ff69b4?style=for-the-badge" alt="Play Now">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tone.js-14-00D4AA?style=flat-square" alt="Tone.js">
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa" alt="PWA">
  <img src="https://img.shields.io/badge/Canvas-2D-green?style=flat-square" alt="Canvas 2D">
  <img src="https://img.shields.io/badge/Responsive-Mobile%20%26%20Desktop-purple?style=flat-square" alt="Responsive">
  <img src="https://img.shields.io/badge/Accessible-WCAG-0066CC?style=flat-square" alt="Accessible">
</p>

---

## ⚠️ Disclaimer

> **Almost all of the code in this project was written by AI**
> (Google Gemini and Claude).
>
> This project is still in a **"prompt war" stage** — many features may be
> rough or need further polish.
>
> Notes:
> - 🕐 Day/night cycle positions still need tuning
> - ⚡ Code is mostly optimized but can still be improved
> - 🔧 Many rough edges remain — feel free to open issues

---

## ✨ Features

### 🎬 Cinematic Opening
- **9-second 4-stage entrance** animation
- Organic stem growth from soil
- Petals bloom one by one in a circular sweep
- A gentle wind gust introduces the world
- Resets to a **unique procedural flower** each time

### 🌸 Interactive Flower
- **36 procedurally-generated petals** with individual physics
- Hover: tilt, glow, color shift, pollen particles
- Click: ripple spread to neighbors, slow-mo sway
- Center "core" pulses synced to ambient music
- Center click: full bloom burst + chromatic-aberration flash

### 🏞️ Living Parallax World
- **Volumetric clouds** with halos and 7-10 puffs each
- Procedural mountains + atmospheric hills
- 6-9 trees + 20+ grass blades (deterministic — no flicker on resize)
- Day/night cycle (90s) with sun, moon, stars, shooting stars
- 12 fireflies at night with smooth glow phases
- God rays at sunrise/sunset
- Volumetric light glow over the flower

### 🎵 Generative Audio (Tone.js)
- **Adaptive soundtrack** with 4 scales (Lydian / Dorian / Mixolydian / Pentatonic)
- 8 chord progressions rotating every 12s
- **10 SFX layers** triggered by weather + time-of-day:
  - wind, rain, thunder, birds, crickets, owl, butterfly flutter, bees
- Reverb, filter sweeps, and pad modulation
- Pan-aware hover bells and click chords
- Reusable interaction synths (no audio node buildup)

### 🌦️ Weather System
- 5 weather types: clear, rain, snow, fog, auto-cycle
- State machine: `idle → transition_in → active → transition_out`
- ObjectPool-based particles with reverse-iteration `release()` (no leaks)
- Auto-progresses every ~30s (configurable)
- Re-triggers SFX layers in AudioLayer

### 🎲 Random Events (EventManager)
- 7 cinematic events with weight-based selection:
  - 🌠 **Meteor shower** — streaking fireballs with glowing trails
  - 🌌 **Aurora borealis** — undulating color bands
  - 🏮 **Sky lanterns** — rising warm lights
  - 🐦 **Bird flock** — V-formation soaring
  - ✨ **Bioluminescence** — pulsing forest glow
  - 💨 **Wind gust** — visible dust streaks
  - 🌈 **Rainbow** — post-rain arc
- `rgbaCache: Map<string, string>` for color string reuse (perf)

### 🦋 Wildlife AI
- **5 butterflies** with full steering AI: seek, arrive, wander, flee, swarm, edge-avoid
- **8 ants** following pheromone-like trails
- **3 moths** attracted to light at night
- **3 ladybugs** climbing the stem
- **2 worms** in the soil
- **1 dragonfly** patrolling
- **1 spider** with web-building behavior
- **Bees** visiting every ~10s to pollinate

### 🖼️ Post-Processing
- Bloom (screen-blend, every 2nd frame)
- Vignette (every frame — cheap)
- Film grain (tiled 256×256 noise, every 3rd frame)
- Chromatic aberration (on click, decays over 400ms)

### 🛠️ Performance
- 60 FPS target on desktop, 30 FPS on low-end mobile
- Static background layer cached on offscreen canvas
- ObjectPool for all particle systems
- Deterministic RNG for static elements (no resize flicker)
- Sub-pixel position rounding to avoid AA shimmer
- Cached sky gradient (recomputed only when `dayProgress` changes by ≥0.005)
- Post-processing frame-skip pattern

### ♿ Accessibility
- WCAG-compliant ARIA labels
- Skip link to main content
- Screen-reader announcer for state changes
- Keyboard navigation (arrow keys + Enter)
- `prefers-reduced-motion` support
- `prefers-contrast` / dark mode media queries
- Focus-visible outlines

### 📱 PWA
- `vite-plugin-pwa` with auto-update service worker
- Workbox precache (11 entries, ~1MB)
- Installable on iOS/Android/desktop
- Manifest with icons, theme color, shortcuts
- Offline-capable

---

## 🎮 How to Interact

| Action | Effect |
|--------|--------|
| **Hover a petal** | Tilt + glow + golden pollen trail |
| **Click a petal** | Petal rotates; ripple to neighbors |
| **Hover the center** | Deeper core breath + radial light |
| **Click the center** | Full bloom burst, slow-mo, light flash |
| **Long-press center** (mobile) | Same as center click |
| **Idle 10s** | Idle charm mode — slow sway + chime |
| **Idle 60s+** | Day → Night transition begins |
| **M** | Toggle mute |
| **R** | Reset (new procedural flower) |
| **Arrow keys** | Move virtual cursor (keyboard nav) |
| **Enter / Space** | Activate current focus |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Install & develop
```bash
git clone https://github.com/fawwaz1st/bunga-daisy.git
cd bunga-daisy
npm install
npm run dev          # opens http://localhost:3000
```

### Build for production
```bash
npm run build        # outputs to dist/
npm run preview      # serve dist/ locally to test
```

### Deploy to GitHub Pages
Pushes to `main` are auto-built and deployed by `.github/workflows/deploy.yml`.
Make sure GitHub Pages is set to source **"GitHub Actions"** in
**Settings → Pages**.

---

## 🏗️ Project Structure

```
Bunga/
├── 📁 .github/
│   └── 📁 workflows/
│       └── deploy.yml                # Auto-build & deploy to GitHub Pages
├── 📁 public/                         # Copied to dist/ root as-is
│   ├── icon-192.png
│   ├── icon-512.png
│   └── 📁 img/
│       └── og-image.png
├── 📁 src/
│   ├── 📄 index.html                  # HTML entry (loader, controls, ARIA)
│   ├── 📄 styles.css                  # Responsive CSS + a11y media queries
│   ├── 📄 main.ts                     # DaisyExperience orchestrator
│   ├── 📁 utils/
│   │   ├── ColorUtils.ts              # HSL/RGB/hex conversions, lerpColor
│   │   ├── EventBus.ts                # Pub/sub
│   │   ├── FlowerParams.ts            # Seeded procedural flower generator
│   │   ├── Noise.ts                   # Perlin/simplex noise
│   │   ├── ObjectPool.ts              # Generic pool: acquire/release/dispose
│   │   ├── SeedRandom.ts              # Mulberry32-style deterministic RNG
│   │   └── TimeManager.ts             # rAF time tracking
│   ├── 📁 modules/
│   │   ├── AudioLayer.ts              # Tone.js adaptive soundtrack + 10 SFX
│   │   ├── BackgroundParallax.ts      # Sky, clouds, hills, trees, fireflies
│   │   ├── BeeSystem.ts               # Auto-pollinating bees
│   │   ├── ButterflySystem.ts         # 5 butterflies with steering AI
│   │   ├── CorePulse.ts               # Center of flower with shimmer
│   │   ├── DaisyFlower.ts             # Top-level flower controller
│   │   ├── EntranceAnimation.ts       # 4-stage cinematic intro
│   │   ├── EntityManager.ts           # Ants, moths, ladybugs, spider, etc.
│   │   ├── EventManager.ts            # 7 random events
│   │   ├── InputHandler.ts            # Mouse + touch + keyboard
│   │   ├── ParticleSystem.ts          # Dust, pollen, bokeh (ObjectPool)
│   │   ├── PetalModule.ts             # 36 petals with spring physics
│   │   ├── PollenTrail.ts             # Cursor-following particles
│   │   ├── PostProcessing.ts          # Bloom / vignette / grain / CA
│   │   ├── SeasonManager.ts           # 4-season palette rotation
│   │   ├── StateManager.ts            # Idle, curiosity, night shift
│   │   ├── Stem.ts                    # Bezier-curve stem with leaves
│   │   ├── WeatherSystem.ts           # 5 weathers with state machine
│   │   └── WindField.ts               # Perlin-noise wind field
│   └── 📁 config.ts                   # Colors, scales, progressions, Utils
├── 📄 vite.config.ts                  # PWA + manual chunks (Tone split)
├── 📄 tsconfig.json                   # TS strict mode
├── 📄 package.json
└── 📄 README.md
```

---

## 🌟 Technical Highlights

- **TypeScript strict mode** with `#` private fields — no `any` leaks
- **Zero runtime dependencies** except `tone`
- **`vite-plugin-pwa`** with Workbox precache
- **Object pool** for all particle systems with `release()` in reverse iteration
- **Deterministic static layer** via `SeedRandom` — no flicker on resize
- **Cached sky gradient** — re-rasterized only on significant time-of-day change
- **Frame-skip post-processing** — bloom every 2 frames, grain every 3
- **Weather-guarded `setWeather`** — only fires on actual change (no CPU bomb)
- **Reusable interaction synths** — no per-click Tone.js node creation
- **`Tone.now() + 0.01` in loop callbacks** — avoids "start time must be strictly greater" crashes
- **Web Audio + Tone.js** for music synthesis and SFX
- **Offscreen canvas** for the static background (cached, blit per frame)
- **`prefers-reduced-motion`** support (halves update rate)
- **Device capability detection** (mobile, low-end, touch, pixel ratio)

---

## 🔧 Notable Bug Fixes

| Issue | Fix |
|-------|-----|
| Trees/grass shifted position on every resize | SeedRandom in static layer draw |
| Film-grain texture "shimmered" on resize | SeedRandom(42) in PostProcessing noise |
| `setWeather` ran every frame (CPU bomb) | `#lastWeather` guard in `main.ts` |
| Particles leaked from ObjectPool | `release()` in reverse iteration |
| Per-click `new Tone.Synth()` buildup | Reusable `bellSynth`/`chordSynth` |
| Tone.js "Start time must be > prev" crash | `Tone.now() + 0.01` in Loop callbacks |
| Sub-pixel AA shimmer on clouds/fireflies | `Math.round(x * 2) / 2` rounding |
| Hills stayed bright at night | Milestone redraws (5 buckets) of static layer |
| Canvas flashed empty on init | `canvas.ready` class + double-rAF loader wait |
| GitHub Pages 404 on TS source | Vite base path + relative asset URLs |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change.

```bash
npm run lint          # eslint
npm run format        # prettier
npm run build         # tsc + vite build
```

---

## 📝 License

MIT — free to use, modify, and share.

---

<p align="center">
  Made with 🌼 by <a href="https://github.com/fawwaz1st">Fawwaz</a> + AI
</p>
