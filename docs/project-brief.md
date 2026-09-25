# Project brief — Dopamine Clicker

A small, satisfying clicker web app. One fancy button in the middle of the screen; every click earns
currency that is spent in a shop on button skins, relaxing page decorations and click upgrades.

Status: **draft** — agreed in discussion, not yet implemented. Numbers (prices, chances, rates) are
starting values to tune during play-testing.

## Goals

- Instant, pleasant feedback on every click.
- A steady trickle of new things to unlock, so there is always a next goal.
- Small enough to finish through the full engineering cycle (spec → tests → implementation → review).

## Non-goals

- No backend, accounts, leaderboards or `app/api` routes — everything runs in the browser.
- We ship no copyrighted footage of our own; every decoration we draw is our own CSS / SVG / canvas
  animation. The `video` decor category (stage 4, revived on 2026-09-20) embeds third-party players
  whose ids the owner configures in `lib/game/videos.ts`, on the privacy-friendly
  `www.youtube-nocookie.com` host, for their personal build.
- No real money, ads or analytics.

## Screen layout

```
┌──────────────────────────────────────────────┐
│ [ Shop box — appears after 10 clicks ]  🌐 ☀︎ │  ← language + theme switchers, top-right
│                                              │
│      (decor items at random positions)       │
│                                              │
│                    1 234                     │  ← balance counter
│                 ┌─────────┐                  │
│                 │  Click  │                  │  ← main button, centered
│                 └─────────┘                  │
│                                              │
│   🐒 [btn]   🤖 [btn]      (helpers, if owned) │
└──────────────────────────────────────────────┘
```

## Core rules

| Rule | Decision |
|---|---|
| Currency | Clicks. One click on the main button adds its click value (see upgrades). |
| Counter | Shows the **balance** (spendable clicks). Shown above the button after the first click. |
| Total clicks | Tracked separately, never decreases. Used for unlocks, so items do not disappear after a purchase. |
| Shop unlock | Shop box appears when total clicks ≥ 10. |
| Item reveal | Each item has a `revealAt` threshold on total clicks; items appear in the shop progressively. |
| Buying | Costs balance. Cannot buy with insufficient balance (item shown disabled with its price). |
| Theme | Dark / light, toggle in the top-right corner. Default follows system preference; choice is saved. |
| Language | Ukrainian / English, switcher next to the theme toggle. Default Ukrainian; choice is saved. |
| Persistence | Full game state in `localStorage` (versioned schema). Survives reloads. |
| Reset | A "Reset progress" action with a confirmation step; wipes game state (keeps theme and language). |
| Reduced motion | With `prefers-reduced-motion`, shakes, particles and large animations are toned down or disabled. |

## Shop

Three categories. Cosmetics (skins, decor) are bought once; upgrades may have levels.

### 1. Button skins

Bought once, then toggled on/off. **Skins stack where possible**: every effect can be combined,
except items in an exclusive slot — equipping one replaces the other in that slot.

| Skin | Slot | What it does | Price |
|---|---|---|---|
| Soft shadow | stack | Box shadow that deepens on hover and press | 15 |
| Squish | stack | Jelly-like squash and spring-back on click | 25 |
| Floating +N | stack | The earned amount floats up from the cursor and fades | 30 |
| Jumping cap | stack | A cap sits on the button and hops on each click | 50 |
| Ripple | stack | A wave spreads from the click point | 60 |
| Neon glow | stack | Pulsing outer glow | 100 |
| Gradient border | stack | Colors flow around the border | 150 |
| Particle burst | stack | Sparks / confetti on each click | 200 |
| Rainbow | stack | Slow hue cycle over the whole button | 300 |
| Cursor trail | stack | Fading trail behind the pointer | 400 |
| Gold | material | Metallic gold surface | 500 |
| Frosted glass | material | Translucent blurred glass | 500 |
| 8-bit pixel | material | Pixel-art button and font | 750 |
| Lava | material | Animated molten surface | 1 000 |
| Sound packs (keyboard, bubble pop, ka-ching) | sound | Click sound | 250 each |

Exclusive slots: **material** (one at a time, default is "Classic") and **sound** (one at a time,
default is silent).

### 2. Page decor

Our own animations. When bought, each item is placed at a **random position** on the screen.
Placement rules: it must not overlap the main button, counter, shop box, top-right switchers, helper
buttons or other decor; the position is saved so it does not jump on reload.

| Decor | Description | Price |
|---|---|---|
| Sleeping cat | A cat that slowly breathes, ears twitch now and then | 100 |
| Lava lamp | Blobs rising and merging | 200 |
| Newton's cradle | Endless clacking balls | 300 |
| Bubble wrap | Pop-able bubbles; each pop gives a few clicks, sheet refills | 400 |
| Pixel aquarium | Fish swimming, bubbles rising | 600 |
| Fireplace | Crackling flames | 800 |
| Rainy window | Drops running down glass | 800 |
| Hydraulic press | Press slowly crushing an endless line of objects | 1 500 |
| Kinetic sand cutter | A knife slicing a colorful sand block | 1 500 |
| Domino chain | Dominoes fall, then reset | 2 000 |
| DVD logo | Bounces around the screen; hitting a corner exactly gives a bonus | 2 500 |
| Marble run | Marbles rolling down a track | 4 000 |
| Pixel runner | Our own mini endless-runner loop (Subway-Surfers-like vibe) | 10 000 |

The DVD logo is the only decor that moves across the whole screen instead of staying in one place.

### 2b. Video decor (stage 4)

Third-party ambient videos, embedded as looping `youtube-nocookie` iframes and placed like
decor. Every frame starts muted so it can autoplay. Expedition music is then unmuted. Without a
network each one falls back to its own placeholder card, and under reduced motion nothing autoplays.

| Video | Price | Appears at |
|---|---|---|
| Expedition music | 2 500 | 1 500 |
| Subway Surfers | 5 000 | 3 000 |
| Hydraulic press | 7 500 | 4 500 |
| Cutting water | 10 000 | 6 000 |
| Duck on a walk | 12 500 | 7 500 |
| Witcher meditation | 15 000 | 9 000 |
| Nature views | 20 000 | 12 000 |
| Expedition 33 trailer | 25 000 | 15 000 |
| Expedition 33 combat | 30 000 | 18 000 |
| Minecraft parkour | 50 000 | 30 000 |
| Spinning seal | 60 000 | 36 000 |

Thirty cosmetic achievements (no reward of any kind) are listed in a panel and announced by a toast;
they live outside the game save, in their own `dopamine-clicker:trophies` key, so a progress reset
keeps the trophy case.

### 3. Click upgrades

| Upgrade | Effect | Price |
|---|---|---|
| Double click | Click value × 2 | 100 |
| Triple click | Click value × 3 (replaces ×2; requires Double click) | 500 |
| Crit | Chance for a click to count × 10. Levels raise the chance: 5% → 10% → 15% | 250, then × 3 per level |
| Combo | Fast consecutive clicks build a temporary multiplier (up to × 2); it decays when clicking pauses | 400 |
| Golden button | A small golden button occasionally appears at a random spot for a few seconds; catching it gives a bonus (e.g. 30 s of click value × 7) | 1 000 |
| 🐒 Monkey | Helper with its own button that it clicks automatically: 1 click/s per monkey | base 50 |
| 🤖 Robot | Faster helper: 5 clicks/s per robot | base 1 000 |
| 🏭 Factory | Fastest helper: 40 clicks/s per factory | base 12 000 |
| Helper speed-up | Per helper type: doubles that type's rate; several levels | 10 × helper base, then × 5 per level |

**Crit visual feedback (required):** a crit must be unmistakable — large "CRIT ×10!" text popping
from the button, a gold flash on the button, a burst of gold particles and a short screen shake.
This is part of the Crit upgrade itself, not a separate skin (still reduced under
`prefers-reduced-motion`).

**Helpers** are shown as separate small buttons with the helper character pressing them, so the
automation is visible.

### Formulas

- Price of a repeatable item: `price = round(base × 1.15^owned)`.
- Main click value: `1 × multiplier(×1 | ×2 | ×3) × combo × (crit ? 10 : 1)` (× golden bonus while active).
- Helper income per second: `Σ count(type) × rate(type) × 2^speedLevel(type)`.
- Random events (crit, golden button spawn) use an injectable random source so they can be tested
  deterministically.

## Architecture (planned)

- Client-only Next.js 16 app, no API routes. UI is client components; game logic is not in them.
- `lib/game/` — pure TypeScript, no React/Next imports, each module with a Vitest test beside it:
  - economy (prices, affordability, reveal/unlock rules),
  - click value (multipliers, combo, crit with injected RNG),
  - helpers income per tick,
  - skin equip rules (stacking + exclusive slots),
  - decor placement (random position avoiding reserved areas),
  - save/load (versioned schema, migration, corrupted-data fallback).
- `lib/i18n/` — `uk` / `en` dictionaries with a test that both have the same keys.
- Helpers run on a single game tick (e.g. every 100 ms) that accumulates fractional clicks.

## Delivery plan (proposal)

1. **Foundation:** theme + language switchers, main button, balance counter, persistence, reset.
2. **Shop v1:** shop unlock at 10, first skins (shadow, squish, +N, jumping cap, gold), 3 decor items
   (sleeping cat, lava lamp, hydraulic press), Double / Triple click, Monkey.
3. **Upgrades v2:** Crit with its visual feedback, Combo, Golden button, Robot, Factory, speed-ups.
4. **Content v3:** revived on 2026-09-20 with a different scope than the original "remaining skins,
   sound packs and decor" (that list stays out of scope): a recognizable sleeping-cat SVG, a Soft
   shadow that is visible in dark mode, a readable Floating +N pill, ten third-party video decor
   items and thirty cosmetic achievements. Stages 1-3 are implemented and archived
   (`add-foundation`, `add-shop-v1`, `add-upgrades-v2`).

Each stage becomes its own OpenSpec change with tests written first.

## Open questions

- Can bought decor be hidden / re-shown, or re-rolled to a new random position?
- Do multipliers (×2 / ×3, golden bonus) also apply to helper clicks, or only to the main button?
- Offline progress: do helpers earn while the tab is closed? (Default: no.)
- Final names and button text in Ukrainian ("Клік", "Магазин", …) and English.
