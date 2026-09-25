// Shared contract for Dopamine Clicker.
//   Stage 1: OpenSpec change add-foundation (archived).
//   Stage 2: OpenSpec change add-shop-v1 (archived): shop, skins, decor, Double/Triple click, Monkey.
//   Stage 3: OpenSpec change add-upgrades-v2 (archived): Crit (+ visual feedback), Combo, Golden
//            button, Robot, Factory, helper speed-ups, save schema v3.
//   Stage 4: OpenSpec change add-content-v3: cat SVG, Soft shadow / Floating +N contrast fixes,
//            video decor (third-party iframes), 30 achievements in their own trophy file,
//            save schema v4 (one new field: `videos`).
// Types only — no runtime logic lives here. Owned by spec-writer; other agents propose changes in
// their reports instead of editing this file.
//
// Implementations:
//   lib/game/click-value.ts  -> GetClickValue, NEUTRAL_CLICK_MODIFIERS,
//                               GetClickMultiplier, GetClickModifiers, CreditClick
//                                                        (Stage 3: +context, exact value, carry)
//   lib/game/state.ts        -> CreateInitialState, ClickMainButton, IsBalanceVisible
//   lib/game/save.ts         -> SerializeGame, ValidateGameState, MigrateSave, ParseSave,
//                               LoadGame, SaveGame, ClearGame, SAVE_KEY, SAVE_BACKUP_KEY,
//                               CURRENT_SAVE_VERSION (= 4),
//                               MIGRATIONS (= { 1: migrateV1ToV2, 2: migrateV2ToV3,
//                                               3: migrateV3ToV4 }),
//                               migrateV1ToV2, migrateV2ToV3, migrateV3ToV4  (Stage 4: +v4)
//   lib/game/preferences.ts  -> ParseTheme, ResolveTheme, ToggleTheme, ParseLanguage,
//                               ResolveLanguage, ToggleLanguage, LoadPreferences, SaveTheme,
//                               SaveLanguage, THEME_KEY, LANGUAGE_KEY
//   lib/game/shop.ts         -> SHOP_CATALOG, SHOP_UNLOCK_CLICKS, PRICE_GROWTH, GetShopItem,
//                               IsShopVisible, IsItemRevealed, GetItemPrice, GetItemLevel,
//                               GetItemStatus, GetRevealedItems, BuyItem     (Stage 3: +levels)
//   lib/game/skins.ts        -> ToggleSkin, IsSkinActive, GetButtonAppearance
//   lib/game/helpers.ts      -> HELPER_TICK_MS, MAX_TICK_MS, SPEED_UP_OF, GetHelperRate,
//                               GetHelperClicksPerSecond, TickHelpers        (Stage 3: +speed-ups)
//   lib/game/decor.ts        -> DECOR_MARGIN, DECOR_GAP, DECOR_MAX_ATTEMPTS, RectsOverlap,
//                               PlaceDecor, DecorRect
//   lib/game/crit.ts         -> CRIT_MULTIPLIER, CRIT_CHANCE_BY_LEVEL, GetCritChance, RollCrit
//                                                                             (Stage 3, new)
//   lib/game/combo.ts        -> COMBO_WINDOW_MS, COMBO_STEP, COMBO_MAX_LEVEL, COMBO_DECAY_MS,
//                               CreateComboState, GetComboLevel, GetComboMultiplier,
//                               RegisterComboClick                           (Stage 3, new)
//   lib/game/golden.ts       -> GOLDEN_MIN_INTERVAL_MS, GOLDEN_MAX_INTERVAL_MS, GOLDEN_LIFETIME_MS,
//                               GOLDEN_BONUS, GOLDEN_BONUS_MS, GOLDEN_SIZE, RollGoldenInterval,
//                               CreateGoldenState, TickGolden, CatchGolden, GetGoldenBonus
//                                                                             (Stage 3, new)
//   lib/game/press.ts        -> CreateClickRuntime, PressMainButton          (Stage 3, new)
//   lib/game/videos.ts       -> VIDEO_DECOR, VIDEO_SIZE, VIDEO_LOAD_TIMEOUT_MS,
//                               VIDEO_EMBED_HOST, GetVideoEntry, BuildEmbedUrl, GetActiveVideos
//                                                                             (Stage 4, new)
//   lib/game/achievements.ts -> ACHIEVEMENTS, ACHIEVEMENT_TOAST_MS, ACHIEVEMENT_TOAST_GAP_MS,
//                               GetAchievement, IsAchievementUnlocked, GetAchievementProgress,
//                               GetAchievementStats, EvaluateAchievements, CreateToastQueue,
//                               EnqueueToasts, AdvanceToastQueue              (Stage 4, new)
//   lib/game/trophies.ts     -> TROPHIES_KEY, TROPHIES_BACKUP_KEY, CURRENT_TROPHIES_VERSION (= 1),
//                               CreateInitialTrophies, SerializeTrophies, ValidateTrophies,
//                               ParseTrophies, LoadTrophies, SaveTrophies, ClearTrophies
//                                                                             (Stage 4, new)
//   lib/ui/contrast.ts       -> ParseCssColor, CompositeOver, RelativeLuminance, ContrastRatio,
//                               LastShadowColor                               (Stage 4, new)
//
// Out of scope (Stage 5 or never): the remaining skins, sound packs and the sound slot, the ten
// remaining own-art decor items, hiding / re-rolling decor, offline progress, achievement rewards.

// ---------------------------------------------------------------------------
// Randomness
// ---------------------------------------------------------------------------

/**
 * Injectable random source: returns a number in [0, 1) on each call (same contract as
 * `Math.random`). The UI passes the page random source `globalThis.__dcRandom ?? Math.random`,
 * read at call time (design D19); unit tests pass a scripted sequence.
 */
export type RandomSource = () => number;

declare global {
  /**
   * Test-only random hook (Stage 3, design D19). Unset in normal use; e2e sets it with
   * `page.addInitScript` so every random draw of the page (crit, golden button, decor and golden
   * placement) is deterministic without overriding `Math.random`.
   */
  var __dcRandom: RandomSource | undefined;
}

// ---------------------------------------------------------------------------
// Catalog ids
// ---------------------------------------------------------------------------

/** Skins in the "stack" slot: any combination can be enabled at once. */
export type StackSkinId = "soft-shadow" | "squish" | "floating-number" | "jumping-cap";
/** Skins in the exclusive "material" slot (Stage 2–3: only Gold). */
export type MaterialSkinId = "gold";
export type SkinId = StackSkinId | MaterialSkinId;
/** Current material of the main button; "classic" is the default, not a purchasable item. */
export type MaterialId = "classic" | MaterialSkinId;
export type SkinSlot = "stack" | "material";

export type DecorId = "sleeping-cat" | "lava-lamp" | "hydraulic-press";

/** Video decor bought in the new `video` category (Stage 4, design D3). */
export type VideoDecorId =
  | "video-music"
  | "video-runner"
  | "video-parkour"
  | "video-soap"
  | "video-kinetic-sand"
  | "video-slime"
  | "video-hydraulic"
  | "video-trailer"
  | "video-combat"
  | "video-rain"
  | "video-seal";

/** One-time click multipliers (Stage 2). */
export type ClickUpgradeId = "double-click" | "triple-click";
/** One-time upgrades that unlock a main-button mechanic (Stage 3). */
export type FeatureUpgradeId = "combo" | "golden-button";
/** Everything stored in `GameState.upgrades` (one-time upgrades). */
export type UpgradeId = ClickUpgradeId | FeatureUpgradeId;

/** Helper types (Stage 3: + robot, factory). */
export type HelperId = "monkey" | "robot" | "factory";
/** Per-helper-type speed-up (Stage 3). */
export type SpeedUpId = "speed-monkey" | "speed-robot" | "speed-factory";
/** Upgrades bought level by level; their level lives in `GameState.levels` (Stage 3). */
export type LeveledUpgradeId = "crit" | SpeedUpId;

export type ShopItemId =
  | SkinId
  | DecorId
  | ClickUpgradeId
  | FeatureUpgradeId
  | LeveledUpgradeId
  | HelperId
  | VideoDecorId;
/** Rendered in this order; "video" is the Stage 4 category (design D4). */
export type ShopCategory = "skins" | "decor" | "upgrades" | "video";

// ---------------------------------------------------------------------------
// Catalog entries (SHOP_CATALOG in lib/game/shop.ts, in display order)
// ---------------------------------------------------------------------------

interface ShopItemBase {
  /**
   * Price for one-time items; base price for helpers (× PRICE_GROWTH per owned) and for leveled
   * upgrades (price of level 1; × priceGrowth per level already bought).
   */
  readonly price: number;
  /** Item is listed in the shop once `totalClicks >= revealAt` (see IsItemRevealed). */
  readonly revealAt: number;
}

export interface SkinItem extends ShopItemBase {
  readonly kind: "skin";
  readonly id: SkinId;
  readonly category: "skins";
  readonly slot: SkinSlot;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface DecorItem extends ShopItemBase {
  readonly kind: "decor";
  readonly id: DecorId;
  readonly category: "decor";
  /** Fixed on-screen size in CSS px, used for placement and rendering. */
  readonly size: Size;
}

export interface ClickUpgradeItem extends ShopItemBase {
  readonly kind: "click-upgrade";
  readonly id: ClickUpgradeId;
  readonly category: "upgrades";
  /** Click multiplier granted while this is the highest owned click upgrade. */
  readonly multiplier: 2 | 3;
  /** Upgrade that must be owned before this one can be bought, or null. */
  readonly requires: ClickUpgradeId | null;
}

/** Combo / Golden button: bought once, stored in `upgrades` (Stage 3). */
export interface FeatureUpgradeItem extends ShopItemBase {
  readonly kind: "feature-upgrade";
  readonly id: FeatureUpgradeId;
  readonly category: "upgrades";
}

/** Crit and the helper speed-ups: bought level by level up to `maxLevel` (Stage 3). */
export interface LeveledUpgradeItem extends ShopItemBase {
  readonly kind: "leveled-upgrade";
  readonly id: LeveledUpgradeId;
  readonly category: "upgrades";
  /** Highest level (3 for every Stage 3 item). */
  readonly maxLevel: number;
  /** Price of the next level = round(price × priceGrowth^currentLevel): crit 3, speed-ups 5. */
  readonly priceGrowth: number;
  /** Speed-ups: helper type that must be owned (count ≥ 1) before the item is revealed; crit: null. */
  readonly helper: HelperId | null;
}

export interface HelperItem extends ShopItemBase {
  readonly kind: "helper";
  readonly id: HelperId;
  readonly category: "upgrades";
  /** Whole clicks per second produced by one helper of this type at speed level 0. */
  readonly clicksPerSecond: number;
}

/** Video decor: bought once, placed like decor, `size` is always VIDEO_SIZE (Stage 4). */
export interface VideoDecorItem extends ShopItemBase {
  readonly kind: "video-decor";
  readonly id: VideoDecorId;
  readonly category: "video";
  readonly size: Size;
}

export type ShopItem =
  | SkinItem
  | DecorItem
  | ClickUpgradeItem
  | FeatureUpgradeItem
  | LeveledUpgradeItem
  | HelperItem
  | VideoDecorItem;

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

/** Schema version 1 state payload (Stage 1). Kept as the input type of the v1 -> v2 migration. */
export interface GameStateV1 {
  /** Spendable clicks. Shown in the counter above the main button. */
  readonly balance: number;
  /**
   * Main-button presses + whole helper clicks ever made (Stage 2 DECISION). Never decreases
   * except through an explicit reset. Drives shop visibility and item reveal.
   */
  readonly totalClicks: number;
}

/**
 * Position of a placed decor item (and of a golden button): top-left corner as a fraction of the
 * viewport, `x = left / viewportWidth`, `y = top / viewportHeight`, both finite and in [0, 1].
 */
export interface DecorPosition {
  readonly x: number;
  readonly y: number;
}

export interface PlacedDecor {
  readonly id: DecorId;
  /** `null` when no free spot was found at purchase time (rendered in the fallback dock). */
  readonly position: DecorPosition | null;
}

/** Schema version 2 state payload (Stage 2). Kept as the input type of the v2 -> v3 migration. */
export interface GameStateV2 extends GameStateV1 {
  readonly ownedSkins: readonly SkinId[];
  readonly enabledSkins: readonly StackSkinId[];
  readonly material: MaterialId;
  readonly decor: readonly PlacedDecor[];
  readonly upgrades: readonly ClickUpgradeId[];
  readonly helpers: Readonly<{ monkey: number }>;
}

/** Schema version 3 state payload (Stage 3). Kept as the input type of the v3 -> v4 migration. */
export interface GameStateV3 extends GameStateV1 {
  readonly ownedSkins: readonly SkinId[];
  readonly enabledSkins: readonly StackSkinId[];
  readonly material: MaterialId;
  readonly decor: readonly PlacedDecor[];
  readonly upgrades: readonly UpgradeId[];
  readonly helpers: Readonly<Record<HelperId, number>>;
  readonly levels: Readonly<Record<LeveledUpgradeId, number>>;
}

/** A bought video decor with its saved position (same convention as PlacedDecor, Stage 4). */
export interface PlacedVideo {
  readonly id: VideoDecorId;
  /** `null` when no free spot was found at purchase time (rendered in the shared dock). */
  readonly position: DecorPosition | null;
}

/**
 * Full persisted game state. Schema version 4. All counts are non-negative safe integers.
 * Every array is kept in SHOP_CATALOG order and has no duplicates (so deep equality is stable).
 * Runtime-only values (helper carry, main-click carry, combo, golden button, crit effect, toast
 * queue) are never part of it, and neither are the trophies: unlocked achievements and their
 * lifetime counters live in their own storage key so a reset can keep them (design D12).
 */
export interface GameState extends GameStateV3 {
  /** Purchased video decor with its saved position (Stage 4; the only v3 -> v4 addition). */
  readonly videos: readonly PlacedVideo[];
}

/**
 * Inputs of the click-value formula from the brief:
 *   value = 1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus   (a real number, design D9;
 *   whole clicks are credited through the main-click carry, see CreditClick)
 */
export interface ClickModifiers {
  /** Upgrade multiplier: 1 | 2 | 3 (Double / Triple click). */
  readonly multiplier: number;
  /** Combo multiplier in [1, 2], steps of 0.1 (Stage 3). */
  readonly combo: number;
  /** Whether this click is a crit (×10, Stage 3). */
  readonly crit: boolean;
  /** Golden button bonus while active (7), otherwise 1 (Stage 3). */
  readonly goldenBonus: number;
}

/**
 * Runtime inputs of one press, computed by `pressMainButton` (or by tests). `getClickModifiers`
 * ignores each field whose upgrade is not owned (combo: "combo" in upgrades; crit: levels.crit ≥ 1;
 * golden bonus: "golden-button" in upgrades).
 */
export interface ClickContext {
  /** `getComboMultiplier(combo, now)` after registering this press. */
  readonly comboMultiplier: number;
  /** Result of `rollCrit(levels.crit, random)` for this press. */
  readonly crit: boolean;
  /** `getGoldenBonus(golden)`: 7 while the bonus runs, otherwise 1. */
  readonly goldenBonus: number;
}

// ---------------------------------------------------------------------------
// Crit (Stage 3)
// ---------------------------------------------------------------------------

/** Levels 0..3 -> chance 0, 0.05, 0.10, 0.15 (CRIT_CHANCE_BY_LEVEL). */
export type CritLevel = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Combo (Stage 3) — runtime only, never saved
// ---------------------------------------------------------------------------

export interface ComboState {
  /** Combo level at the moment of the last registered press, integer in [0, COMBO_MAX_LEVEL]. */
  readonly level: number;
  /** Timestamp (ms, same clock as `nowMs`) of the last registered press, or null before the first. */
  readonly lastClickAt: number | null;
}

// ---------------------------------------------------------------------------
// Golden button (Stage 3) — runtime only, never saved
// ---------------------------------------------------------------------------

export interface GoldenSpawn {
  /** Saved-style fractional top-left corner (same convention as decor, see `decorRect`). */
  readonly position: DecorPosition;
  /** Remaining visible time in ms (> 0). */
  readonly remainingMs: number;
}

export interface GoldenState {
  /** ms until the next spawn; counts down only while no golden button is visible (0 while visible). */
  readonly nextSpawnMs: number;
  /** The golden button on screen, or null. At most one at a time. */
  readonly visible: GoldenSpawn | null;
  /** Remaining ms of the ×7 bonus; 0 = inactive. */
  readonly bonusMs: number;
}

export interface TickGoldenInput {
  readonly golden: GoldenState;
  /** Clamped to [0, MAX_TICK_MS] like helper ticks; NaN / negative count as 0. */
  readonly elapsedMs: number;
  /** Used only to roll the next interval (one call per roll). */
  readonly random: RandomSource;
  /**
   * Picks a free spot for a new golden button (UI: `placeDecor` with GOLDEN_SIZE, the reserved rects
   * of design D8 and the page random source `pageRandom`). Called exactly once per spawn attempt; null = skip this spawn.
   */
  readonly place: () => DecorPosition | null;
}

// ---------------------------------------------------------------------------
// Main-button press pipeline (Stage 3)
// ---------------------------------------------------------------------------

/** In-memory companion of GameState for the main button; reset to `createClickRuntime()` on reset. */
export interface ClickRuntime {
  readonly combo: ComboState;
  /** null until the golden button is owned and the first game tick / purchase created it. */
  readonly golden: GoldenState | null;
}

/**
 * Result of crediting one click value: `credited` whole clicks go to the balance, `carry` is the
 * fractional remainder in [0, 1) (rounded to 6 decimals), kept in memory only, never saved.
 */
export interface CreditResult {
  readonly credited: number;
  readonly carry: number;
}

export interface PressInput {
  readonly state: GameState;
  readonly runtime: ClickRuntime;
  /** Main-click carry before this press, in [0, 1). Runtime only (0 after load and reset). */
  readonly carry: number;
  /** Current time in ms (UI: `performance.now()`). */
  readonly nowMs: number;
  /** Used only for the crit roll (0 calls when levels.crit is 0, exactly 1 otherwise). */
  readonly random: RandomSource;
}

export interface PressResult {
  readonly state: GameState;
  /** Same object as the input runtime when nothing in it changed (combo not owned). */
  readonly runtime: ClickRuntime;
  /** Exact click value of this press (`getClickValue(modifiers)`), may be fractional. */
  readonly value: number;
  /** Whole clicks added to the balance by this press (`creditClick(carry, value).credited`). */
  readonly credited: number;
  /** Main-click carry after this press, in [0, 1). */
  readonly carry: number;
  /** True when this press was a crit (drives the crit visual feedback). */
  readonly crit: boolean;
}

// ---------------------------------------------------------------------------
// Video decor (Stage 4) — lib/game/videos.ts
// ---------------------------------------------------------------------------

/** Only provider of this stage; a new one adds a branch in `buildEmbedUrl` (design D6). */
export type VideoProvider = "youtube-nocookie";

/** One configurable entry of VIDEO_DECOR; swapping a video means editing this array only. */
export interface VideoEntry {
  readonly id: VideoDecorId;
  readonly provider: VideoProvider;
  /** Provider video id (Stage 4 ships placeholders until the human supplies the real ones). */
  readonly videoId: string;
  /** Optional start offset in whole seconds; only a value > 0 is put into the URL. */
  readonly startSeconds?: number;
}

/** Lifecycle of one video decor element in the page (design D7). */
export type VideoState = "idle" | "loading" | "playing" | "offline";

// ---------------------------------------------------------------------------
// Achievements (Stage 4) — lib/game/achievements.ts
// ---------------------------------------------------------------------------

export type AchievementId =
  | "first-click"
  | "clicks-100"
  | "clicks-1000"
  | "clicks-10000"
  | "clicks-100000"
  | "balance-1000"
  | "balance-50000"
  | "first-purchase"
  | "purchases-10"
  | "purchases-25"
  | "skins-3"
  | "skins-all"
  | "gold-equipped"
  | "first-decor"
  | "decor-all"
  | "cat-nap"
  | "first-video"
  | "videos-all"
  | "first-helper"
  | "helpers-10"
  | "factory-owner"
  | "first-crit"
  | "crits-100"
  | "combo-5"
  | "combo-max"
  | "first-golden"
  | "golden-10"
  | "reset-once"
  | "achievements-10"
  | "achievements-all";

/** Grouping shown in the panel; purely cosmetic (design D10). */
export type AchievementCategory =
  | "clicks"
  | "balance"
  | "purchases"
  | "skins"
  | "decor"
  | "video"
  | "helpers"
  | "crit"
  | "combo"
  | "golden"
  | "reset"
  | "meta";

/** Every number an achievement can be measured against; see GetAchievementStats. */
export type AchievementMetric =
  | "totalClicks"
  | "balance"
  | "purchases"
  | "skinsOwned"
  | "goldEquipped"
  | "decorOwned"
  | "catOwned"
  | "videosOwned"
  | "helpersTotal"
  | "factories"
  | "crits"
  | "maxComboLevel"
  | "goldenCaught"
  | "resets"
  | "achievementsUnlocked";

/**
 * Data-driven definition: the predicate is `stats[metric] >= threshold` (design D10), so the whole
 * catalog stays pure, serializable and exhaustively testable.
 */
export interface Achievement {
  readonly id: AchievementId;
  readonly category: AchievementCategory;
  readonly metric: AchievementMetric;
  /** Integer > 0. Achievements with threshold 1 show no progress in the panel. */
  readonly threshold: number;
}

/**
 * All 15 metrics; `achievementsUnlocked` is filled in by EvaluateAchievements. Eleven of them are
 * derived from the current `GameState` (and therefore drop back to 0 after a reset), four come from
 * the trophy counters (design D10, D12).
 */
export type AchievementStats = Readonly<Record<AchievementMetric, number>>;

/**
 * Lifetime counters that only achievements read (design D12). They live in the trophy file, not in
 * the game save, so a progress reset keeps them; `resets` is incremented by the reset itself.
 */
export interface TrophyStats {
  /** Number of crit presses. */
  readonly crits: number;
  /** Number of golden buttons caught. */
  readonly goldenCaught: number;
  /** Highest combo level ever reached, integer in [0, COMBO_MAX_LEVEL]. */
  readonly maxComboLevel: number;
  /** Number of confirmed progress resets. */
  readonly resets: number;
}

/**
 * Everything the trophy case holds. Stored under TROPHIES_KEY, never inside the game save, and
 * never touched by "Reset progress" other than the `resets` increment (design D12).
 */
export interface Trophies {
  /** Unlocked achievements in ACHIEVEMENTS order, no duplicates; unlocks are sticky. */
  readonly unlocked: readonly AchievementId[];
  readonly stats: TrophyStats;
}

export interface AchievementEvaluation {
  /** Every unlocked id in catalog order, including the ones that were already unlocked. */
  readonly unlocked: readonly AchievementId[];
  /** Only the ids this call added, in catalog order; drives the toast queue. */
  readonly newlyUnlocked: readonly AchievementId[];
}

/** Runtime-only toast state (design D13); never saved. */
export interface ToastQueue {
  /** The achievement currently shown, or null while idle or during the gap. */
  readonly current: AchievementId | null;
  /** Remaining ms of the current toast, or of the gap when `current` is null; 0 when idle. */
  readonly remainingMs: number;
  /** Waiting ids in catalog order. */
  readonly pending: readonly AchievementId[];
}

// ---------------------------------------------------------------------------
// Colour maths (Stage 4) — lib/ui/contrast.ts, used by the e2e contrast assertions
// ---------------------------------------------------------------------------

/** Channels 0–255, alpha 0–1. */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

/**
 * Status of one catalog item for a given state, evaluated in this priority order:
 * - `owned`        — one-time item already bought (never for helpers or leveled upgrades);
 * - `maxed`        — leveled upgrade at `maxLevel` (Stage 3);
 * - `hidden`       — not revealed (see IsItemRevealed; not rendered in the shop);
 * - `requires`     — a click upgrade whose `requires` item is not owned (shown disabled);
 * - `unaffordable` — `balance < current price` (shown disabled with the price);
 * - `available`    — can be bought now.
 */
export type ShopItemStatus =
  | "owned"
  | "maxed"
  | "hidden"
  | "requires"
  | "unaffordable"
  | "available";

export type BuyFailureReason = Exclude<ShopItemStatus, "available">;

export interface BuyOptions {
  /** Decor only: position chosen by PlaceDecor at purchase time. Missing = null. */
  readonly decorPosition?: DecorPosition | null;
  /** Video decor only: position chosen by PlaceDecor with VIDEO_SIZE. Missing = null (Stage 4). */
  readonly videoPosition?: DecorPosition | null;
}

export type BuyResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly reason: BuyFailureReason };

/** Visual state of the main button derived from skins. */
export interface ButtonAppearance {
  /** Enabled stack skins in catalog order. */
  readonly stack: readonly StackSkinId[];
  readonly material: MaterialId;
}

// ---------------------------------------------------------------------------
// Helpers (game tick)
// ---------------------------------------------------------------------------

/**
 * Result of one helper tick. `carry` is the fractional remainder in milli-clicks
 * (integer in [0, 999]); it lives only in memory and is never saved.
 */
export interface HelperTickResult {
  readonly state: GameState;
  readonly carry: number;
}

// ---------------------------------------------------------------------------
// Decor placement (also used for the golden button)
// ---------------------------------------------------------------------------

/** Axis-aligned rectangle in CSS px (same shape as a DOMRect subset). */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface PlaceDecorInput {
  readonly viewport: Size;
  readonly size: Size;
  /** Areas the decor must not overlap (UI elements and already placed decor), in px. */
  readonly reserved: readonly Rect[];
  readonly random: RandomSource;
  /** Distance kept from the viewport edges. Default DECOR_MARGIN (16). */
  readonly margin?: number;
  /** Extra free space kept around the decor when testing overlap. Default DECOR_GAP (16). */
  readonly gap?: number;
  /** Number of random candidates tried. Default DECOR_MAX_ATTEMPTS (50). */
  readonly maxAttempts?: number;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Minimal storage interface; `window.localStorage` satisfies it. Injected so lib/ stays DOM-free. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Storage key of the game save (value of SAVE_KEY in lib/game/save.ts). */
export type SaveKey = "dopamine-clicker:save";

/** Storage key of the backup of the last corrupted raw save (value of SAVE_BACKUP_KEY). */
export type SaveBackupKey = "dopamine-clicker:save:bad";

/** Storage key of the trophy file (value of TROPHIES_KEY in lib/game/trophies.ts, Stage 4). */
export type TrophiesKey = "dopamine-clicker:trophies";

/** Storage key of the backup of the last corrupted raw trophy file (TROPHIES_BACKUP_KEY). */
export type TrophiesBackupKey = "dopamine-clicker:trophies:bad";

/** Version of the trophy schema written by this build. */
export type CurrentTrophiesVersion = 1;

/** On-disk envelope written under TROPHIES_KEY. */
export interface TrophyFileV1 {
  readonly version: 1;
  readonly trophies: Trophies;
}

/** Same statuses as a game save; `migrated` cannot occur while the only version is 1. */
export interface TrophiesLoadResult {
  readonly trophies: Trophies;
  readonly status: LoadStatus;
}

/** Version of the save schema written by this build. */
export type CurrentSaveVersion = 4;

/** Stage 1 on-disk envelope (read-only now; migrated v1 -> v2 -> v3 on load). */
export interface SaveFileV1 {
  readonly version: 1;
  readonly state: GameStateV1;
}

/** Stage 2 on-disk envelope (read-only now; migrated v2 -> v3 on load). */
export interface SaveFileV2 {
  readonly version: 2;
  readonly state: GameStateV2;
}

/** Stage 3 on-disk envelope (read-only now; migrated v3 -> v4 on load). */
export interface SaveFileV3 {
  readonly version: 3;
  readonly state: GameStateV3;
}

/** On-disk envelope written under SAVE_KEY from Stage 4 on. */
export interface SaveFileV4 {
  readonly version: 4;
  readonly state: GameState;
}

/** Any envelope read from storage before migration/validation. */
export interface UnknownSaveFile {
  readonly version: number;
  readonly state: unknown;
}

/** Converts the `state` payload of version N into the payload of version N + 1. */
export type Migration = (state: unknown) => unknown;

/** Keyed by SOURCE version: table[1] migrates v1 -> v2, table[2] v2 -> v3, table[3] v3 -> v4. */
export type MigrationTable = Readonly<Record<number, Migration>>;

export interface ParseSaveOptions {
  /**
   * Defaults to the built-in table MIGRATIONS
   * (`{ 1: migrateV1ToV2, 2: migrateV2ToV3, 3: migrateV3ToV4 }`).
   */
  readonly migrations?: MigrationTable;
  /** Defaults to CURRENT_SAVE_VERSION (4). */
  readonly targetVersion?: number;
}

/**
 * - `fresh`     — nothing stored (or storage unreadable); initial state returned.
 * - `loaded`    — stored save was already at the target version and valid.
 * - `migrated`  — stored save was older, migrated successfully and valid.
 * - `corrupted` — stored value unparseable, invalid, from an unknown/future version, or a
 *                 migration step is missing/throws; initial state returned.
 */
export type LoadStatus = "fresh" | "loaded" | "migrated" | "corrupted";

export interface LoadResult {
  readonly state: GameState;
  readonly status: LoadStatus;
}

// ---------------------------------------------------------------------------
// Preferences (theme + language) — stored separately from game state, survive reset
// ---------------------------------------------------------------------------

export type Theme = "light" | "dark";
export type Language = "uk" | "en";

export interface Preferences {
  /** Explicit saved choice, or null = follow system preference. */
  readonly theme: Theme | null;
  /** Saved language, or the default "uk". */
  readonly language: Language;
}

// ---------------------------------------------------------------------------
// Function signatures (implemented in lib/game/*.ts; all pure, never mutate inputs)
// ---------------------------------------------------------------------------

// click-value.ts
/**
 * `Number((1 × multiplier × combo × (crit ? 10 : 1) × goldenBonus).toFixed(6))` — the exact product
 * with float artefacts removed (e.g. 3 × 1.1 -> 3.3, 3 × 1.4 × 10 -> 42), NOT rounded to an
 * integer (Stage 3, design D9).
 */
export type GetClickValue = (modifiers: ClickModifiers) => number;
/**
 * `total = Number((carry + value).toFixed(6))`, `credited = Math.floor(total)`,
 * `carry' = Number((total − credited).toFixed(6))` (design D9).
 */
export type CreditClick = (carry: number, value: number) => CreditResult;
/** 3 if "triple-click" is owned, else 2 if "double-click" is owned, else 1. */
export type GetClickMultiplier = (state: GameState) => 1 | 2 | 3;
/**
 * `{ multiplier: GetClickMultiplier(state), combo, crit, goldenBonus }` where each context field is
 * used only if its upgrade is owned (see ClickContext), else neutral. Without `context` all three
 * are neutral (`combo: 1, crit: false, goldenBonus: 1`), exactly as in Stage 2.
 */
export type GetClickModifiers = (state: GameState, context?: ClickContext) => ClickModifiers;

// state.ts
/** v4 fresh state; see specs/clicker-core "Initial game state". */
export type CreateInitialState = () => GameState;
/**
 * Carry-free click: adds `Math.floor(GetClickValue(modifiers))` to balance and 1 to totalClicks;
 * every other field is copied unchanged. The UI uses `PressMainButton` (carry-aware) instead.
 */
export type ClickMainButton = (state: GameState, modifiers: ClickModifiers) => GameState;
export type IsBalanceVisible = (state: GameStateV1) => boolean;

// shop.ts
export type GetShopItem = (id: ShopItemId) => ShopItem;
/** `totalClicks >= SHOP_UNLOCK_CLICKS` (10). */
export type IsShopVisible = (state: GameStateV1) => boolean;
/**
 * `totalClicks >= item.revealAt`, and for speed-ups additionally `helpers[item.helper] >= 1`
 * (Stage 3; the parameter type widened from GameStateV1 to GameState).
 */
export type IsItemRevealed = (state: GameState, id: ShopItemId) => boolean;
/**
 * One-time items: `item.price`. Helpers: `R(item.price × PRICE_GROWTH ** helpers[id])`.
 * Leveled upgrades: `R(item.price × item.priceGrowth ** levels[id])` (also at max level).
 * `R(x) = Math.round(Number(x.toFixed(6)))` (design D6 of add-shop-v1).
 */
export type GetItemPrice = (state: GameState, id: ShopItemId) => number;
/** `state.levels[id]` (Stage 3). */
export type GetItemLevel = (state: GameState, id: LeveledUpgradeId) => number;
export type GetItemStatus = (state: GameState, id: ShopItemId) => ShopItemStatus;
/** Items with status !== "hidden", in SHOP_CATALOG order, optionally filtered by category. */
export type GetRevealedItems = (state: GameState, category?: ShopCategory) => readonly ShopItem[];
/**
 * Buys one unit / level if `GetItemStatus` is "available"; otherwise `{ ok: false, reason: status }`.
 * Never changes totalClicks. See specs/shop "Buying".
 */
export type BuyItem = (state: GameState, id: ShopItemId, options?: BuyOptions) => BuyResult;

// skins.ts
/**
 * Owned stack skin: toggles membership in `enabledSkins`. Owned Gold: material
 * "gold" <-> "classic". Not owned: returns the input state object unchanged (same reference).
 */
export type ToggleSkin = (state: GameState, id: SkinId) => GameState;
/** Stack skin: in `enabledSkins`. Material skin: `material === id`. */
export type IsSkinActive = (state: GameState, id: SkinId) => boolean;
export type GetButtonAppearance = (state: GameState) => ButtonAppearance;

// helpers.ts
/** `helpers[id] × clicksPerSecond(id) × 2 ** levels[SPEED_UP_OF[id]]` (Stage 3). */
export type GetHelperRate = (state: GameState, id: HelperId) => number;
/** `Σ GetHelperRate(state, type)` over monkey, robot, factory. */
export type GetHelperClicksPerSecond = (state: GameState) => number;
/**
 * Advances helpers by `elapsedMs` (clamped to [0, MAX_TICK_MS]; NaN/negative -> 0).
 * `milli = carry + clicksPerSecond × elapsed`; `whole = floor(milli / 1000)` is added to both
 * balance and totalClicks (click multipliers, combo, crit and golden bonus are NOT applied);
 * new carry = `milli % 1000`. When `whole === 0` the returned `state` is the input object.
 */
export type TickHelpers = (state: GameState, carry: number, elapsedMs: number) => HelperTickResult;

// decor.ts
/** Strict overlap: rectangles that only touch at an edge do NOT overlap. */
export type RectsOverlap = (a: Rect, b: Rect) => boolean;
/** Random placement avoiding `reserved`; null if the viewport is too small or all attempts fail. */
export type PlaceDecor = (input: PlaceDecorInput) => DecorPosition | null;
/**
 * Pixel rect of a placed decor for the current viewport:
 * `left = clamp(round(x × vw), 0, vw − w)`, `top = clamp(round(y × vh), 0, vh − h)`.
 */
export type DecorRect = (position: DecorPosition, size: Size, viewport: Size) => Rect;

// crit.ts (Stage 3)
/** `CRIT_CHANCE_BY_LEVEL[level]` for integer levels 0..3, otherwise 0 (below) / 0.15 (above). */
export type GetCritChance = (level: number) => number;
/**
 * Level ≤ 0: returns false WITHOUT calling `random`. Otherwise calls `random` exactly once and
 * returns `random() < GetCritChance(level)`.
 */
export type RollCrit = (level: number, random: RandomSource) => boolean;

// combo.ts (Stage 3)
/** `{ level: 0, lastClickAt: null }`, a new object each call. */
export type CreateComboState = () => ComboState;
/**
 * Effective level at `nowMs`: 0 before the first press; `level` while
 * `idle = max(0, nowMs − lastClickAt) ≤ COMBO_WINDOW_MS`; afterwards
 * `max(0, level − ceil((idle − COMBO_WINDOW_MS) / COMBO_DECAY_MS))`.
 */
export type GetComboLevel = (combo: ComboState, nowMs: number) => number;
/** `1 + GetComboLevel(combo, nowMs) / 10` (i.e. level × COMBO_STEP), in [1, 2]. */
export type GetComboMultiplier = (combo: ComboState, nowMs: number) => number;
/**
 * Registers one press at `nowMs`: a "fast" press (previous press exists and
 * `nowMs − lastClickAt ≤ COMBO_WINDOW_MS`) sets `level = min(COMBO_MAX_LEVEL, effective + 1)`;
 * any other press keeps the decayed effective level. Always sets `lastClickAt = nowMs`.
 */
export type RegisterComboClick = (combo: ComboState, nowMs: number) => ComboState;

// golden.ts (Stage 3)
/**
 * `GOLDEN_MIN_INTERVAL_MS + Math.floor(random() × (GOLDEN_MAX_INTERVAL_MS − GOLDEN_MIN_INTERVAL_MS + 1))`
 * — an integer in [30 000, 90 000]; exactly one `random` call.
 */
export type RollGoldenInterval = (random: RandomSource) => number;
/** `{ nextSpawnMs: RollGoldenInterval(random), visible: null, bonusMs: 0 }`. */
export type CreateGoldenState = (random: RandomSource) => GoldenState;
/** One game tick of the golden button; see specs/golden-button "Golden button timing". */
export type TickGolden = (input: TickGoldenInput) => GoldenState;
/**
 * Visible golden button: `{ nextSpawnMs: RollGoldenInterval(random), visible: null,
 * bonusMs: GOLDEN_BONUS_MS }` (a running bonus is restarted, not stacked). Nothing visible: returns
 * the input object unchanged (same reference) without calling `random`.
 */
export type CatchGolden = (golden: GoldenState, random: RandomSource) => GoldenState;
/** GOLDEN_BONUS (7) when `golden !== null && golden.bonusMs > 0`, otherwise 1. */
export type GetGoldenBonus = (golden: GoldenState | null) => number;

// press.ts (Stage 3)
/** `{ combo: createComboState(), golden: null }`, a new object each call. */
export type CreateClickRuntime = () => ClickRuntime;
/**
 * One main-button press: registers the combo (only if "combo" is owned), rolls the crit
 * (`rollCrit(levels.crit, random)`), reads the golden bonus, computes the exact value with
 * `getClickModifiers(state, context)` / `getClickValue`, credits it with `creditClick(carry, value)`
 * and adds `credited` to balance and 1 to totalClicks. See specs/click-upgrades.
 */
export type PressMainButton = (input: PressInput) => PressResult;

// save.ts
/** Writes `{ version: 4, state }` with exactly the GameState fields (no timestamps, no runtime). */
export type SerializeGame = (state: GameState) => string;
/** v4 validator; returns a normalized copy (arrays in catalog order, extra keys dropped) or null. */
export type ValidateGameState = (value: unknown) => GameState | null;
/** Built-in MIGRATIONS[1]: v1 payload -> v2 payload with default shop fields (unchanged). */
export type MigrateV1ToV2 = (state: unknown) => unknown;
/** Built-in MIGRATIONS[2]: v2 payload -> v3 payload (robot/factory 0, all levels 0). */
export type MigrateV2ToV3 = (state: unknown) => unknown;
/** Built-in MIGRATIONS[3]: v3 payload -> v4 payload (adds `videos: []`, nothing else). */
export type MigrateV3ToV4 = (state: unknown) => unknown;
export type MigrateSave = (
  file: UnknownSaveFile,
  migrations: MigrationTable,
  targetVersion: number,
) => UnknownSaveFile | null;
/** Pure: never touches storage (the corrupted-save backup is LoadGame's job). */
export type ParseSave = (raw: string | null, options?: ParseSaveOptions) => LoadResult;
/**
 * Reads SAVE_KEY and parses it. Never throws. When the status is `corrupted` and the raw value was
 * non-null, copies the raw string verbatim to SAVE_BACKUP_KEY (overwriting any previous backup;
 * a failed backup write is ignored). Never writes the backup for other statuses and never
 * modifies SAVE_KEY.
 */
export type LoadGame = (storage: KeyValueStorage, options?: ParseSaveOptions) => LoadResult;
/** Returns false (never throws) when storage rejects the write. */
export type SaveGame = (storage: KeyValueStorage, state: GameState) => boolean;
/** Removes SAVE_KEY only; never touches SAVE_BACKUP_KEY or preference keys. Never throws. */
export type ClearGame = (storage: KeyValueStorage) => void;

// preferences.ts
export type ParseTheme = (raw: string | null) => Theme | null;
export type ResolveTheme = (stored: Theme | null, systemPrefersDark: boolean) => Theme;
export type ToggleTheme = (current: Theme) => Theme;
export type ParseLanguage = (raw: string | null) => Language | null;
export type ResolveLanguage = (stored: Language | null) => Language;
export type ToggleLanguage = (current: Language) => Language;
/** Never throws; unreadable storage yields { theme: null, language: "uk" }. */
export type LoadPreferences = (storage: KeyValueStorage) => Preferences;
/** Return false (never throw) when storage rejects the write. */
export type SaveTheme = (storage: KeyValueStorage, theme: Theme) => boolean;
export type SaveLanguage = (storage: KeyValueStorage, language: Language) => boolean;

// trophies.ts (Stage 4) — the trophy file, independent of the game save
/** `{ unlocked: [], stats: { crits: 0, goldenCaught: 0, maxComboLevel: 0, resets: 0 } }`, new each call. */
export type CreateInitialTrophies = () => Trophies;
/** Writes `{ version: 1, trophies }` with exactly the Trophies fields (no timestamps, no runtime). */
export type SerializeTrophies = (trophies: Trophies) => string;
/**
 * Accepts a non-array object whose `unlocked` is an array of distinct known AchievementIds and
 * whose `stats` is a non-array object with exactly the four counters (non-negative safe integers,
 * `maxComboLevel` in [0, 10]); returns a normalized copy (unlocked in ACHIEVEMENTS order, unknown
 * keys dropped) or null.
 */
export type ValidateTrophies = (value: unknown) => Trophies | null;
/** Pure: never touches storage. A version other than 1 is `corrupted` (no migrations yet). */
export type ParseTrophies = (raw: string | null) => TrophiesLoadResult;
/**
 * Reads TROPHIES_KEY and parses it. Never throws. On `corrupted` with a non-null raw value, copies
 * the raw string verbatim to TROPHIES_BACKUP_KEY (mirrors LoadGame); never modifies TROPHIES_KEY.
 */
export type LoadTrophies = (storage: KeyValueStorage) => TrophiesLoadResult;
/** Returns false (never throws) when storage rejects the write. */
export type SaveTrophies = (storage: KeyValueStorage, trophies: Trophies) => boolean;
/**
 * Removes TROPHIES_KEY only. Never called by "Reset progress" (which keeps the trophies, design
 * D12); kept for completeness and for tests. Never throws.
 */
export type ClearTrophies = (storage: KeyValueStorage) => void;

// videos.ts (Stage 4)
/** Entry of VIDEO_DECOR with that id (throws for an unknown id, like `getShopItem`). */
export type GetVideoEntry = (id: VideoDecorId) => VideoEntry;
/**
 * `<VIDEO_EMBED_HOST>/embed/<videoId>?autoplay=1&mute=1&loop=1&playlist=<videoId>&controls=0
 * &modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`, plus `&start=<n>` last when
 * `startSeconds` is an integer > 0 (design D6). Pure: no DOM, no network.
 */
export type BuildEmbedUrl = (entry: VideoEntry) => string;
/** Every placed video with a non-null position, in the given order. */
export type GetActiveVideos = (placed: readonly PlacedVideo[]) => readonly PlacedVideo[];

// achievements.ts (Stage 4)
/** Entry of ACHIEVEMENTS with that id. */
export type GetAchievement = (id: AchievementId) => Achievement;
/** `stats[achievement.metric] >= achievement.threshold`. */
export type IsAchievementUnlocked = (achievement: Achievement, stats: AchievementStats) => boolean;
/** `Math.min(1, Math.max(0, stats[metric] / threshold))`. */
export type GetAchievementProgress = (achievement: Achievement, stats: AchievementStats) => number;
/**
 * All 15 metrics (design D10): eleven read from the current `GameState`, four (`crits`,
 * `maxComboLevel`, `goldenCaught`, `resets`) copied from `trophies.stats`; `achievementsUnlocked`
 * is 0 here and is filled in per pass by `evaluateAchievements`. Pure, never mutates its inputs.
 */
export type GetAchievementStats = (state: GameState, trophies: Trophies) => AchievementStats;
/**
 * Repeats passes over ACHIEVEMENTS until a pass adds nothing (at most ACHIEVEMENTS.length passes),
 * recomputing `achievementsUnlocked` before each pass. Unknown input ids are dropped, known ones
 * stay unlocked forever. Both result arrays are in catalog order.
 */
export type EvaluateAchievements = (
  unlocked: readonly AchievementId[],
  stats: AchievementStats,
) => AchievementEvaluation;
/** `{ current: null, remainingMs: 0, pending: [] }`, a new object each call. */
export type CreateToastQueue = () => ToastQueue;
/**
 * Appends the ids that are neither `current` nor already pending and promotes the first one when
 * nothing is showing and no gap is running; returns the input object when nothing is added.
 */
export type EnqueueToasts = (queue: ToastQueue, ids: readonly AchievementId[]) => ToastQueue;
/**
 * One tick of the toast queue: `elapsedMs` clamped to [0, MAX_TICK_MS] (NaN / negative -> 0), the
 * input object returned when the effective elapsed is 0 or the queue is idle, otherwise toast ->
 * gap -> next toast without carrying leftover time (design D13).
 */
export type AdvanceToastQueue = (queue: ToastQueue, elapsedMs: number) => ToastQueue;

// ../ui/contrast.ts (Stage 4) — presentation maths used by the e2e colour assertions
/** `#rgb`, `#rrggbb`, `rgb()/rgba()` with or without commas and alpha, `transparent`; else null. */
export type ParseCssColor = (value: string) => Rgba | null;
/** `{ r, g, b, a: 1 }` with `Math.round(fg.a * fg.c + (1 - fg.a) * bg.c)` per channel. */
export type CompositeOver = (fg: Rgba, bg: Rgba) => Rgba;
/** WCAG 2.1 relative luminance of the colour treated as opaque, in [0, 1]. */
export type RelativeLuminance = (color: Rgba) => number;
/** `Number(((L1 + 0.05) / (L2 + 0.05)).toFixed(4))`, L1 >= L2; non-opaque inputs are composited. */
export type ContrastRatio = (a: Rgba, b: Rgba) => number;
/** Colour of the last comma-separated layer of a computed `box-shadow`, or null. */
export type LastShadowColor = (boxShadow: string) => Rgba | null;
