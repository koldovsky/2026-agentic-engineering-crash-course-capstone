import type {
  BuyItem,
  GameState,
  GetItemLevel,
  GetItemPrice,
  GetItemStatus,
  GetRevealedItems,
  GetShopItem,
  IsItemRevealed,
  IsShopVisible,
  MaterialSkinId,
  PlacedDecor,
  PlacedVideo,
  ShopItem,
  ShopItemId,
  StackSkinId,
} from "./types";
import { VIDEO_DECOR, VIDEO_SIZE } from "./videos";

/** The shop box appears once `totalClicks >= SHOP_UNLOCK_CLICKS` (specs/shop). */
export const SHOP_UNLOCK_CLICKS = 10;

/** Growth factor of repeatable prices: `round(base × 1.15^owned)` (design D6). */
export const PRICE_GROWTH = 1.15;

/** Video prices and reveal thresholds, in `VIDEO_DECOR` order (design D4). */
const VIDEO_PRICES: readonly { readonly price: number; readonly revealAt: number }[] = [
  { price: 2500, revealAt: 1500 },
  { price: 5000, revealAt: 3000 },
  { price: 7500, revealAt: 4500 },
  { price: 10000, revealAt: 6000 },
  { price: 12500, revealAt: 7500 },
  { price: 15000, revealAt: 9000 },
  { price: 20000, revealAt: 12000 },
  { price: 25000, revealAt: 15000 },
  { price: 30000, revealAt: 18000 },
  { price: 50000, revealAt: 30000 },
  { price: 60000, revealAt: 36000 },
];

/**
 * Stage 4 catalog in display order; also the canonical order of every array in GameState
 * (add-shop-v1 design D5, add-upgrades-v2 design D6, design D4).
 */
export const SHOP_CATALOG: readonly ShopItem[] = Object.freeze([
  { kind: "skin", id: "soft-shadow", category: "skins", slot: "stack", price: 15, revealAt: 10 },
  { kind: "skin", id: "squish", category: "skins", slot: "stack", price: 25, revealAt: 15 },
  { kind: "skin", id: "floating-number", category: "skins", slot: "stack", price: 30, revealAt: 20 },
  { kind: "skin", id: "jumping-cap", category: "skins", slot: "stack", price: 50, revealAt: 35 },
  { kind: "skin", id: "gold", category: "skins", slot: "material", price: 500, revealAt: 300 },
  {
    kind: "decor",
    id: "sleeping-cat",
    category: "decor",
    size: { width: 120, height: 80 },
    price: 100,
    revealAt: 75,
  },
  {
    kind: "decor",
    id: "lava-lamp",
    category: "decor",
    size: { width: 64, height: 144 },
    price: 200,
    revealAt: 150,
  },
  {
    kind: "decor",
    id: "hydraulic-press",
    category: "decor",
    size: { width: 144, height: 144 },
    price: 1500,
    revealAt: 750,
  },
  {
    kind: "click-upgrade",
    id: "double-click",
    category: "upgrades",
    multiplier: 2,
    requires: null,
    price: 100,
    revealAt: 60,
  },
  {
    kind: "click-upgrade",
    id: "triple-click",
    category: "upgrades",
    multiplier: 3,
    requires: "double-click",
    price: 500,
    revealAt: 250,
  },
  {
    kind: "leveled-upgrade",
    id: "crit",
    category: "upgrades",
    maxLevel: 3,
    priceGrowth: 3,
    helper: null,
    price: 250,
    revealAt: 150,
  },
  { kind: "feature-upgrade", id: "combo", category: "upgrades", price: 400, revealAt: 250 },
  {
    kind: "feature-upgrade",
    id: "golden-button",
    category: "upgrades",
    price: 1000,
    revealAt: 700,
  },
  {
    kind: "helper",
    id: "monkey",
    category: "upgrades",
    clicksPerSecond: 1,
    price: 50,
    revealAt: 30,
  },
  {
    kind: "leveled-upgrade",
    id: "speed-monkey",
    category: "upgrades",
    maxLevel: 3,
    priceGrowth: 5,
    helper: "monkey",
    price: 500,
    revealAt: 300,
  },
  {
    kind: "helper",
    id: "robot",
    category: "upgrades",
    clicksPerSecond: 5,
    price: 1000,
    revealAt: 600,
  },
  {
    kind: "leveled-upgrade",
    id: "speed-robot",
    category: "upgrades",
    maxLevel: 3,
    priceGrowth: 5,
    helper: "robot",
    price: 10000,
    revealAt: 6000,
  },
  {
    kind: "helper",
    id: "factory",
    category: "upgrades",
    clicksPerSecond: 40,
    price: 12000,
    revealAt: 8000,
  },
  {
    kind: "leveled-upgrade",
    id: "speed-factory",
    category: "upgrades",
    maxLevel: 3,
    priceGrowth: 5,
    helper: "factory",
    price: 120000,
    revealAt: 75000,
  },
  ...VIDEO_DECOR.map((entry, index) => ({
    kind: "video-decor" as const,
    id: entry.id,
    category: "video" as const,
    size: VIDEO_SIZE,
    price: VIDEO_PRICES[index].price,
    revealAt: VIDEO_PRICES[index].revealAt,
  })),
]);

/** Catalog position of every id; the canonical order of every array in GameState. */
const CATALOG_INDEX: ReadonlyMap<ShopItemId, number> = new Map(
  SHOP_CATALOG.map((item, index) => [item.id, index]),
);

/** Sorts any id list into catalog order without mutating the input. */
function sortByCatalog<T extends ShopItemId>(ids: readonly T[]): T[] {
  return [...ids].sort((a, b) => (CATALOG_INDEX.get(a) ?? 0) - (CATALOG_INDEX.get(b) ?? 0));
}

export const getShopItem: GetShopItem = (id) => {
  const item = SHOP_CATALOG.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`unknown shop item: ${id}`);
  }
  return item;
};

export const isShopVisible: IsShopVisible = (state) => state.totalClicks >= SHOP_UNLOCK_CLICKS;

export const isItemRevealed: IsItemRevealed = (state, id) => {
  const item = getShopItem(id);
  if (state.totalClicks < item.revealAt) {
    return false;
  }
  // A speed-up stays hidden until at least one helper of its type is owned (design D5).
  return item.kind !== "leveled-upgrade" || item.helper === null || state.helpers[item.helper] >= 1;
};

/** Round the mathematically intended value, not the float artefact (design D6). */
function roundPrice(value: number): number {
  return Math.round(Number(value.toFixed(6)));
}

export const getItemPrice: GetItemPrice = (state, id) => {
  const item = getShopItem(id);
  if (item.kind === "helper") {
    return roundPrice(item.price * PRICE_GROWTH ** state.helpers[item.id]);
  }
  if (item.kind === "leveled-upgrade") {
    return roundPrice(item.price * item.priceGrowth ** state.levels[item.id]);
  }
  return item.price;
};

export const getItemLevel: GetItemLevel = (state, id) => state.levels[id];

/** Helpers and leveled upgrades are repeatable, so they are never "owned" (design D14). */
function isOwned(state: GameState, item: ShopItem): boolean {
  switch (item.kind) {
    case "skin":
      return state.ownedSkins.includes(item.id);
    case "decor":
      return state.decor.some((entry) => entry.id === item.id);
    case "video-decor":
      return state.videos.some((entry) => entry.id === item.id);
    case "click-upgrade":
      return state.upgrades.includes(item.id);
    case "feature-upgrade":
      return state.upgrades.includes(item.id);
    case "leveled-upgrade":
      return false;
    case "helper":
      return false;
  }
}

export const getItemStatus: GetItemStatus = (state, id) => {
  const item = getShopItem(id);
  if (isOwned(state, item)) {
    return "owned";
  }
  // A fully leveled upgrade reads "maxed" even before its reveal threshold (design D14).
  if (item.kind === "leveled-upgrade" && state.levels[item.id] >= item.maxLevel) {
    return "maxed";
  }
  if (!isItemRevealed(state, id)) {
    return "hidden";
  }
  if (item.kind === "click-upgrade" && item.requires !== null) {
    if (!state.upgrades.includes(item.requires)) {
      return "requires";
    }
  }
  return state.balance < getItemPrice(state, id) ? "unaffordable" : "available";
};

export const getRevealedItems: GetRevealedItems = (state, category) =>
  SHOP_CATALOG.filter(
    (item) =>
      (category === undefined || item.category === category) &&
      getItemStatus(state, item.id) !== "hidden",
  );

export const buyItem: BuyItem = (state, id, options) => {
  const status = getItemStatus(state, id);
  if (status !== "available") {
    return { ok: false, reason: status };
  }

  const item = getShopItem(id);
  const balance = state.balance - getItemPrice(state, id);

  switch (item.kind) {
    case "skin":
      return {
        ok: true,
        state: {
          ...state,
          balance,
          ownedSkins: sortByCatalog([...state.ownedSkins, item.id]),
          // Buying equips immediately (design D7).
          enabledSkins:
            item.slot === "stack"
              ? sortByCatalog([...state.enabledSkins, item.id as StackSkinId])
              : state.enabledSkins,
          material: item.slot === "material" ? (item.id as MaterialSkinId) : state.material,
        },
      };
    case "decor":
      return {
        ok: true,
        state: {
          ...state,
          balance,
          decor: sortByCatalog([...state.decor.map((entry) => entry.id), item.id]).map(
            (decorId) =>
              decorId === item.id
                ? { id: item.id, position: options?.decorPosition ?? null }
                : (state.decor.find((entry) => entry.id === decorId) as PlacedDecor),
          ),
        },
      };
    case "video-decor":
      return {
        ok: true,
        state: {
          ...state,
          balance,
          videos: sortByCatalog([...state.videos.map((entry) => entry.id), item.id]).map(
            (videoId) =>
              videoId === item.id
                ? { id: item.id, position: options?.videoPosition ?? null }
                : (state.videos.find((entry) => entry.id === videoId) as PlacedVideo),
          ),
        },
      };
    case "click-upgrade":
      return {
        ok: true,
        state: {
          ...state,
          balance,
          upgrades: sortByCatalog([...state.upgrades, item.id]),
        },
      };
    case "helper":
      return {
        ok: true,
        state: {
          ...state,
          balance,
          helpers: { ...state.helpers, [item.id]: state.helpers[item.id] + 1 },
        },
      };
    case "feature-upgrade":
      return {
        ok: true,
        state: {
          ...state,
          balance,
          upgrades: sortByCatalog([...state.upgrades, item.id]),
        },
      };
    case "leveled-upgrade":
      return {
        ok: true,
        state: {
          ...state,
          balance,
          levels: { ...state.levels, [item.id]: state.levels[item.id] + 1 },
        },
      };
  }
};
