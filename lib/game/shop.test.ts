import { describe, expect, it } from "vitest";
import {
  buyItem,
  getItemLevel,
  getItemPrice,
  getItemStatus,
  getRevealedItems,
  getShopItem,
  isItemRevealed,
  isShopVisible,
  PRICE_GROWTH,
  SHOP_CATALOG,
  SHOP_UNLOCK_CLICKS,
} from "./shop";
import { VIDEO_DECOR, VIDEO_SIZE } from "./videos";
import type {
  BuyResult,
  GameState,
  HelperId,
  LeveledUpgradeId,
  ShopItem,
  ShopItemId,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers (notation from design.md: FRESH, S({...}) with `helpers` and `levels`
// shallow-merged into the FRESH defaults)
// ---------------------------------------------------------------------------

type StateOverrides = Partial<Omit<GameState, "helpers" | "levels">> & {
  readonly helpers?: Partial<Record<HelperId, number>>;
  readonly levels?: Partial<Record<LeveledUpgradeId, number>>;
};

function fresh(): GameState {
  return {
    balance: 0,
    totalClicks: 0,
    ownedSkins: [],
    enabledSkins: [],
    material: "classic",
    decor: [],
    videos: [],
    upgrades: [],
    helpers: { monkey: 0, robot: 0, factory: 0 },
    levels: { crit: 0, "speed-monkey": 0, "speed-robot": 0, "speed-factory": 0 },
  };
}

const FRESH: GameState = fresh();

function S({ helpers, levels, ...rest }: StateOverrides = {}): GameState {
  const base = fresh();
  return {
    ...base,
    ...rest,
    helpers: { ...base.helpers, ...helpers },
    levels: { ...base.levels, ...levels },
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function ids(items: readonly ShopItem[]): ShopItemId[] {
  return items.map((item) => item.id);
}

function okState(result: BuyResult): GameState {
  if (!result.ok) {
    throw new Error(`expected a successful purchase, got reason "${result.reason}"`);
  }
  return result.state;
}

// ---------------------------------------------------------------------------
// Shop catalog
// ---------------------------------------------------------------------------

describe("shop: Shop catalog", () => {
  it("Catalog ids and order", () => {
    expect(SHOP_CATALOG.map((i) => i.id)).toEqual([
      "soft-shadow",
      "squish",
      "floating-number",
      "jumping-cap",
      "gold",
      "sleeping-cat",
      "lava-lamp",
      "hydraulic-press",
      "double-click",
      "triple-click",
      "crit",
      "combo",
      "golden-button",
      "monkey",
      "speed-monkey",
      "robot",
      "speed-robot",
      "factory",
      "speed-factory",
      "video-music",
      "video-runner",
      "video-parkour",
      "video-soap",
      "video-kinetic-sand",
      "video-slime",
      "video-hydraulic",
      "video-trailer",
      "video-combat",
      "video-rain",
      "video-seal",
    ]);
    expect(SHOP_CATALOG.length).toBe(30);
    expect(
      SHOP_CATALOG.filter((item) => item.kind === "video-decor").map((item) => item.id),
    ).toEqual(VIDEO_DECOR.map((v) => v.id));
  });

  it("Catalog entries", () => {
    expect(SHOP_CATALOG).toEqual([
      { kind: "skin", id: "soft-shadow", category: "skins", slot: "stack", price: 15, revealAt: 10 },
      { kind: "skin", id: "squish", category: "skins", slot: "stack", price: 25, revealAt: 15 },
      {
        kind: "skin",
        id: "floating-number",
        category: "skins",
        slot: "stack",
        price: 30,
        revealAt: 20,
      },
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
      ...(
        [
          ["video-music", 2500, 1500],
          ["video-runner", 5000, 3000],
          ["video-parkour", 7500, 4500],
          ["video-soap", 10000, 6000],
          ["video-kinetic-sand", 12500, 7500],
          ["video-slime", 15000, 9000],
          ["video-hydraulic", 20000, 12000],
          ["video-trailer", 25000, 15000],
          ["video-combat", 30000, 18000],
          ["video-rain", 50000, 30000],
          ["video-seal", 60000, 36000],
        ] as const
      ).map(([id, price, revealAt]) => ({
        kind: "video-decor",
        id,
        category: "video",
        size: { width: 384, height: 216 },
        price,
        revealAt,
      })),
    ]);

    expect(VIDEO_SIZE).toEqual({ width: 384, height: 216 });
    expect(getShopItem("video-runner")).toEqual({
      kind: "video-decor",
      id: "video-runner",
      category: "video",
      size: { width: 384, height: 216 },
      price: 5000,
      revealAt: 3000,
    });
    expect(getShopItem("video-rain")).toEqual({
      kind: "video-decor",
      id: "video-rain",
      category: "video",
      size: { width: 384, height: 216 },
      price: 50000,
      revealAt: 30000,
    });
    expect(getShopItem("gold")).toEqual({
      kind: "skin",
      id: "gold",
      category: "skins",
      slot: "material",
      price: 500,
      revealAt: 300,
    });
    expect(getShopItem("lava-lamp")).toEqual({
      kind: "decor",
      id: "lava-lamp",
      category: "decor",
      size: { width: 64, height: 144 },
      price: 200,
      revealAt: 150,
    });
    expect(getShopItem("triple-click")).toEqual({
      kind: "click-upgrade",
      id: "triple-click",
      category: "upgrades",
      multiplier: 3,
      requires: "double-click",
      price: 500,
      revealAt: 250,
    });
    expect(getShopItem("monkey")).toEqual({
      kind: "helper",
      id: "monkey",
      category: "upgrades",
      clicksPerSecond: 1,
      price: 50,
      revealAt: 30,
    });
    expect(getShopItem("crit")).toEqual({
      kind: "leveled-upgrade",
      id: "crit",
      category: "upgrades",
      maxLevel: 3,
      priceGrowth: 3,
      helper: null,
      price: 250,
      revealAt: 150,
    });
    expect(getShopItem("combo")).toEqual({
      kind: "feature-upgrade",
      id: "combo",
      category: "upgrades",
      price: 400,
      revealAt: 250,
    });
    expect(getShopItem("robot")).toEqual({
      kind: "helper",
      id: "robot",
      category: "upgrades",
      clicksPerSecond: 5,
      price: 1000,
      revealAt: 600,
    });
    expect(getShopItem("speed-factory")).toEqual({
      kind: "leveled-upgrade",
      id: "speed-factory",
      category: "upgrades",
      maxLevel: 3,
      priceGrowth: 5,
      helper: "factory",
      price: 120000,
      revealAt: 75000,
    });
    for (const item of SHOP_CATALOG) {
      expect(getShopItem(item.id)).toEqual(item);
    }
  });

  it("Constants", () => {
    expect(SHOP_UNLOCK_CLICKS).toBe(10);
    expect(PRICE_GROWTH).toBe(1.15);
  });
});

// ---------------------------------------------------------------------------
// Shop visibility
// ---------------------------------------------------------------------------

describe("shop: Shop visibility", () => {
  it("Unlock threshold", () => {
    expect(isShopVisible({ balance: 500, totalClicks: 9 })).toBe(false);
    expect(isShopVisible({ balance: 0, totalClicks: 10 })).toBe(true);
    expect(isShopVisible({ balance: 0, totalClicks: 11 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Progressive reveal
// ---------------------------------------------------------------------------

describe("shop: Progressive reveal", () => {
  it.each([
    ["soft-shadow", 10],
    ["squish", 15],
    ["floating-number", 20],
    ["jumping-cap", 35],
    ["gold", 300],
    ["sleeping-cat", 75],
    ["lava-lamp", 150],
    ["hydraulic-press", 750],
    ["double-click", 60],
    ["triple-click", 250],
    ["crit", 150],
    ["combo", 250],
    ["golden-button", 700],
    ["monkey", 30],
    ["robot", 600],
    ["factory", 8000],
    ["video-runner", 3000],
    ["video-parkour", 4500],
    ["video-soap", 6000],
    ["video-kinetic-sand", 7500],
    ["video-slime", 9000],
    ["video-music", 1500],
    ["video-hydraulic", 12000],
    ["video-trailer", 15000],
    ["video-combat", 18000],
    ["video-rain", 30000],
    ["video-seal", 36000],
  ] as const)("Reveal boundaries for every item: %s at %i", (id, revealAt) => {
    expect(isItemRevealed(S({ totalClicks: revealAt - 1 }), id)).toBe(false);
    expect(isItemRevealed(S({ totalClicks: revealAt }), id)).toBe(true);
  });

  it("Speed-ups need their helper", () => {
    expect(isItemRevealed(S({ totalClicks: 300 }), "speed-monkey")).toBe(false);
    expect(isItemRevealed(S({ totalClicks: 299, helpers: { monkey: 1 } }), "speed-monkey")).toBe(
      false,
    );
    expect(isItemRevealed(S({ totalClicks: 300, helpers: { monkey: 1 } }), "speed-monkey")).toBe(
      true,
    );

    expect(isItemRevealed(S({ totalClicks: 6000, helpers: { monkey: 9 } }), "speed-robot")).toBe(
      false,
    );
    expect(isItemRevealed(S({ totalClicks: 6000, helpers: { robot: 1 } }), "speed-robot")).toBe(
      true,
    );
    expect(
      isItemRevealed(S({ totalClicks: 74999, helpers: { factory: 1 } }), "speed-factory"),
    ).toBe(false);
    expect(
      isItemRevealed(S({ totalClicks: 75000, helpers: { factory: 1 } }), "speed-factory"),
    ).toBe(true);
  });

  it("Revealed items at 20 clicks", () => {
    expect(ids(getRevealedItems(S({ totalClicks: 20 })))).toEqual([
      "soft-shadow",
      "squish",
      "floating-number",
    ]);
  });

  it("Revealed items by category", () => {
    expect(ids(getRevealedItems(S({ totalClicks: 60 }), "upgrades"))).toEqual([
      "double-click",
      "monkey",
    ]);
    expect(ids(getRevealedItems(S({ totalClicks: 60 }), "decor"))).toEqual([]);
  });

  it("Revealed upgrades at 750 clicks", () => {
    expect(ids(getRevealedItems(S({ totalClicks: 750 }), "upgrades"))).toEqual([
      "double-click",
      "triple-click",
      "crit",
      "combo",
      "golden-button",
      "monkey",
      "robot",
    ]);
  });

  it("Everything revealed late in the game", () => {
    expect(
      ids(
        getRevealedItems(
          S({ totalClicks: 100000, helpers: { monkey: 1, robot: 1, factory: 1 } }),
        ),
      ),
    ).toEqual(SHOP_CATALOG.map((item) => item.id));
  });

  it("Videos are revealed one by one", () => {
    expect(ids(getRevealedItems(S({ totalClicks: 1499 }), "video"))).toEqual([]);
    expect(ids(getRevealedItems(S({ totalClicks: 1500 }), "video"))).toEqual(["video-music"]);
    expect(ids(getRevealedItems(S({ totalClicks: 3000 }), "video"))).toEqual([
      "video-music",
      "video-runner",
    ]);
    expect(ids(getRevealedItems(S({ totalClicks: 9000 }), "video"))).toEqual([
      "video-music",
      "video-runner",
      "video-parkour",
      "video-soap",
      "video-kinetic-sand",
      "video-slime",
    ]);
    expect(ids(getRevealedItems(S({ totalClicks: 30000 }), "video"))).toEqual(
      VIDEO_DECOR.map((v) => v.id).filter((id) => id !== "video-seal"),
    );
    expect(ids(getRevealedItems(S({ totalClicks: 36000 }), "video"))).toEqual(
      VIDEO_DECOR.map((v) => v.id),
    );
  });

  it("Nothing revealed before 10", () => {
    expect(getRevealedItems(S({ totalClicks: 9 }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

describe("shop: Prices", () => {
  it("One-time prices ignore state", () => {
    expect(getItemPrice(FRESH, "gold")).toBe(500);
    expect(
      getItemPrice(S({ balance: 9999, totalClicks: 9999, upgrades: ["double-click"] }), "gold"),
    ).toBe(500);
    expect(getItemPrice(FRESH, "hydraulic-press")).toBe(1500);
    expect(getItemPrice(FRESH, "soft-shadow")).toBe(15);
    expect(getItemPrice(FRESH, "combo")).toBe(400);
    expect(getItemPrice(FRESH, "golden-button")).toBe(1000);
  });

  it("Monkey price curve", () => {
    const prices = [0, 1, 2, 3, 4, 5, 10].map((n) =>
      getItemPrice(S({ helpers: { monkey: n } }), "monkey"),
    );
    expect(prices).toEqual([50, 58, 66, 76, 87, 101, 202]);
  });

  it("Robot and factory price curves", () => {
    const counts = [0, 1, 2, 3, 4, 5, 10];
    expect(counts.map((n) => getItemPrice(S({ helpers: { robot: n } }), "robot"))).toEqual([
      1000, 1150, 1323, 1521, 1749, 2011, 4046,
    ]);
    expect(counts.map((n) => getItemPrice(S({ helpers: { factory: n } }), "factory"))).toEqual([
      12000, 13800, 15870, 18251, 20988, 24136, 48547,
    ]);
  });

  it("Rounding guard for the float artefact", () => {
    // Precondition of the scenario: the naive formula lands just below .5.
    expect(50 * 1.15 ** 1).toBe(57.49999999999999);
    expect(1000 * 1.15 ** 2).toBe(1322.4999999999998);
    expect(getItemPrice(S({ helpers: { monkey: 1 } }), "monkey")).toBe(58);
    expect(getItemPrice(S({ helpers: { robot: 2 } }), "robot")).toBe(1323);
  });

  it("Leveled upgrade prices", () => {
    expect([0, 1, 2, 3].map((n) => getItemPrice(S({ levels: { crit: n } }), "crit"))).toEqual([
      250, 750, 2250, 6750,
    ]);
    expect(
      [0, 1, 2].map((n) => getItemPrice(S({ levels: { "speed-monkey": n } }), "speed-monkey")),
    ).toEqual([500, 2500, 12500]);
    expect(
      [0, 1, 2].map((n) => getItemPrice(S({ levels: { "speed-robot": n } }), "speed-robot")),
    ).toEqual([10000, 50000, 250000]);
    expect(
      [0, 1, 2].map((n) => getItemPrice(S({ levels: { "speed-factory": n } }), "speed-factory")),
    ).toEqual([120000, 600000, 3000000]);
  });

  it("Item level", () => {
    const state = S({ levels: { crit: 2, "speed-robot": 1 } });
    expect(getItemLevel(state, "crit")).toBe(2);
    expect(getItemLevel(state, "speed-monkey")).toBe(0);
    expect(getItemLevel(state, "speed-robot")).toBe(1);
    expect(getItemLevel(state, "speed-factory")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Item status
// ---------------------------------------------------------------------------

describe("shop: Item status", () => {
  it("Affordability boundary", () => {
    expect(getItemStatus(S({ balance: 14, totalClicks: 10 }), "soft-shadow")).toBe("unaffordable");
    expect(getItemStatus(S({ balance: 15, totalClicks: 10 }), "soft-shadow")).toBe("available");
  });

  it("Hidden wins over affordable", () => {
    expect(getItemStatus(S({ balance: 1000, totalClicks: 9 }), "soft-shadow")).toBe("hidden");
  });

  it("Owned one-time items", () => {
    expect(
      getItemStatus(
        S({ totalClicks: 20, ownedSkins: ["soft-shadow"], enabledSkins: [] }),
        "soft-shadow",
      ),
    ).toBe("owned");
    expect(
      getItemStatus(
        S({ totalClicks: 200, decor: [{ id: "lava-lamp", position: null }] }),
        "lava-lamp",
      ),
    ).toBe("owned");
    expect(getItemStatus(S({ totalClicks: 60, upgrades: ["double-click"] }), "double-click")).toBe(
      "owned",
    );
    expect(getItemStatus(S({ totalClicks: 250, upgrades: ["combo"] }), "combo")).toBe("owned");
    expect(
      getItemStatus(S({ totalClicks: 700, upgrades: ["golden-button"] }), "golden-button"),
    ).toBe("owned");
  });

  it("Triple click requirement", () => {
    const states = [
      S({ balance: 500, totalClicks: 250 }),
      S({ balance: 0, totalClicks: 250 }),
      S({ balance: 499, totalClicks: 250, upgrades: ["double-click"] }),
      S({ balance: 500, totalClicks: 250, upgrades: ["double-click"] }),
      S({ balance: 0, totalClicks: 250, upgrades: ["double-click", "triple-click"] }),
    ];
    expect(states.map((s) => getItemStatus(s, "triple-click"))).toEqual([
      "requires",
      "requires",
      "unaffordable",
      "available",
      "owned",
    ]);
  });

  it("Helpers are never owned", () => {
    expect(
      getItemStatus(S({ balance: 58, totalClicks: 30, helpers: { monkey: 1 } }), "monkey"),
    ).toBe("available");
    expect(
      getItemStatus(S({ balance: 57, totalClicks: 30, helpers: { monkey: 1 } }), "monkey"),
    ).toBe("unaffordable");
    expect(
      getItemStatus(S({ balance: 1150, totalClicks: 600, helpers: { robot: 1 } }), "robot"),
    ).toBe("available");
    expect(
      getItemStatus(S({ balance: 1149, totalClicks: 600, helpers: { robot: 1 } }), "robot"),
    ).toBe("unaffordable");
  });

  it("Leveled upgrade statuses", () => {
    const states = [
      S({ balance: 250, totalClicks: 150 }),
      S({ balance: 249, totalClicks: 150 }),
      S({ balance: 750, totalClicks: 150, levels: { crit: 1 } }),
      S({ balance: 749, totalClicks: 150, levels: { crit: 1 } }),
      S({ balance: 99999, totalClicks: 150, levels: { crit: 3 } }),
      S({ balance: 99999, totalClicks: 149 }),
    ];
    expect(states.map((s) => getItemStatus(s, "crit"))).toEqual([
      "available",
      "unaffordable",
      "available",
      "unaffordable",
      "maxed",
      "hidden",
    ]);
  });

  it("Maxed wins over hidden", () => {
    expect(getItemStatus(S({ totalClicks: 0, levels: { crit: 3 } }), "crit")).toBe("maxed");
  });

  it("Speed-up without its helper is hidden", () => {
    expect(getItemStatus(S({ balance: 1000, totalClicks: 300 }), "speed-monkey")).toBe("hidden");
    expect(
      getItemStatus(S({ balance: 1000, totalClicks: 300, helpers: { monkey: 1 } }), "speed-monkey"),
    ).toBe("available");
  });
});

// ---------------------------------------------------------------------------
// Buying
// ---------------------------------------------------------------------------

describe("shop: Buying", () => {
  it("Buy a stack skin", () => {
    expect(buyItem(S({ balance: 20, totalClicks: 12 }), "soft-shadow")).toEqual({
      ok: true,
      state: S({
        balance: 5,
        totalClicks: 12,
        ownedSkins: ["soft-shadow"],
        enabledSkins: ["soft-shadow"],
      }),
    });
  });

  it("Arrays keep catalog order", () => {
    const next = okState(
      buyItem(
        S({
          balance: 100,
          totalClicks: 50,
          ownedSkins: ["jumping-cap"],
          enabledSkins: ["jumping-cap"],
        }),
        "soft-shadow",
      ),
    );
    expect(next.ownedSkins).toEqual(["soft-shadow", "jumping-cap"]);
    expect(next.enabledSkins).toEqual(["soft-shadow", "jumping-cap"]);
    expect(next.balance).toBe(85);
  });

  it("Buy Gold", () => {
    const next = okState(
      buyItem(
        S({ balance: 600, totalClicks: 300, ownedSkins: ["squish"], enabledSkins: ["squish"] }),
        "gold",
      ),
    );
    expect(next).toEqual(
      S({
        balance: 100,
        totalClicks: 300,
        ownedSkins: ["squish", "gold"],
        enabledSkins: ["squish"],
        material: "gold",
      }),
    );
  });

  it("Buy decor with a position", () => {
    const next = okState(
      buyItem(S({ balance: 250, totalClicks: 150 }), "lava-lamp", {
        decorPosition: { x: 0.5, y: 0.25 },
      }),
    );
    expect(next).toEqual(
      S({
        balance: 50,
        totalClicks: 150,
        decor: [{ id: "lava-lamp", position: { x: 0.5, y: 0.25 } }],
      }),
    );
  });

  it("Buy decor without a position", () => {
    const next = okState(buyItem(S({ balance: 100, totalClicks: 75 }), "sleeping-cat"));
    expect(next.decor).toEqual([{ id: "sleeping-cat", position: null }]);
    expect(next.balance).toBe(0);
  });

  it("Decor keeps catalog order", () => {
    const next = okState(
      buyItem(
        S({
          balance: 100,
          totalClicks: 800,
          decor: [{ id: "hydraulic-press", position: { x: 0.1, y: 0.1 } }],
        }),
        "sleeping-cat",
        { decorPosition: { x: 0.7, y: 0.2 } },
      ),
    );
    expect(next.decor).toEqual([
      { id: "sleeping-cat", position: { x: 0.7, y: 0.2 } },
      { id: "hydraulic-press", position: { x: 0.1, y: 0.1 } },
    ]);
  });

  it("Buy click upgrades", () => {
    expect(okState(buyItem(S({ balance: 100, totalClicks: 60 }), "double-click"))).toEqual(
      S({ balance: 0, totalClicks: 60, upgrades: ["double-click"] }),
    );
    expect(
      okState(
        buyItem(S({ balance: 600, totalClicks: 250, upgrades: ["double-click"] }), "triple-click"),
      ),
    ).toEqual(S({ balance: 100, totalClicks: 250, upgrades: ["double-click", "triple-click"] }));
  });

  it("Buy feature upgrades in catalog order", () => {
    expect(
      okState(buyItem(S({ balance: 400, totalClicks: 250, upgrades: ["double-click"] }), "combo")),
    ).toEqual(S({ balance: 0, totalClicks: 250, upgrades: ["double-click", "combo"] }));

    const withGolden = okState(
      buyItem(S({ balance: 1100, totalClicks: 700, upgrades: ["golden-button"] }), "combo"),
    );
    expect(withGolden.upgrades).toEqual(["combo", "golden-button"]);
    expect(withGolden.balance).toBe(700);

    const withDouble = okState(
      buyItem(
        S({ balance: 100, totalClicks: 700, upgrades: ["combo", "golden-button"] }),
        "double-click",
      ),
    );
    expect(withDouble.upgrades).toEqual(["double-click", "combo", "golden-button"]);
  });

  it("Buy crit levels until maxed", () => {
    let state = S({ balance: 3250, totalClicks: 150 });
    const balances: number[] = [];
    const levels: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      state = okState(buyItem(state, "crit"));
      balances.push(state.balance);
      levels.push(state.levels.crit);
    }
    expect(balances).toEqual([3000, 2250, 0]);
    expect(levels).toEqual([1, 2, 3]);
    expect(state.totalClicks).toBe(150);
    expect(buyItem(state, "crit")).toEqual({ ok: false, reason: "maxed" });
  });

  it("Buy robots until broke", () => {
    let state = S({ balance: 3000, totalClicks: 600 });
    const balances: number[] = [];
    for (let i = 0; i < 2; i += 1) {
      state = okState(buyItem(state, "robot"));
      balances.push(state.balance);
    }
    expect(balances).toEqual([2000, 850]);
    expect(state.helpers).toEqual({ monkey: 0, robot: 2, factory: 0 });
    expect(buyItem(state, "robot")).toEqual({ ok: false, reason: "unaffordable" });
  });

  it("Buy a speed-up", () => {
    expect(
      buyItem(S({ balance: 10000, totalClicks: 6000, helpers: { robot: 1 } }), "speed-robot"),
    ).toEqual({
      ok: true,
      state: S({
        balance: 0,
        totalClicks: 6000,
        helpers: { robot: 1 },
        levels: { "speed-robot": 1 },
      }),
    });
    expect(buyItem(S({ balance: 10000, totalClicks: 6000 }), "speed-robot")).toEqual({
      ok: false,
      reason: "hidden",
    });
  });

  it("Buy monkeys until broke", () => {
    let state = S({ balance: 200, totalClicks: 30 });
    const balances: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      state = okState(buyItem(state, "monkey"));
      balances.push(state.balance);
    }
    expect(balances).toEqual([150, 92, 26]);
    expect(state.helpers).toEqual({ monkey: 3, robot: 0, factory: 0 });
    expect(state.totalClicks).toBe(30);
    expect(buyItem(state, "monkey")).toEqual({ ok: false, reason: "unaffordable" });
  });

  it("Buy a video with a position", () => {
    expect(
      buyItem(S({ balance: 6000, totalClicks: 3000 }), "video-runner", {
        videoPosition: { x: 0.25, y: 0.75 },
      }),
    ).toEqual({
      ok: true,
      state: S({
        balance: 1000,
        totalClicks: 3000,
        videos: [{ id: "video-runner", position: { x: 0.25, y: 0.75 } }],
      }),
    });
  });

  it("Videos keep catalog order and can be owned only once", () => {
    const next = okState(
      buyItem(
        S({
          balance: 20000,
          totalClicks: 30000,
          videos: [{ id: "video-soap", position: null }],
        }),
        "video-parkour",
      ),
    );
    expect(next.videos).toEqual([
      { id: "video-parkour", position: null },
      { id: "video-soap", position: null },
    ]);
    expect(next.balance).toBe(12500);
    expect(buyItem(next, "video-soap")).toEqual({ ok: false, reason: "owned" });
  });

  it("Failure reasons", () => {
    expect(buyItem(S({ balance: 1000, totalClicks: 9 }), "soft-shadow")).toEqual({
      ok: false,
      reason: "hidden",
    });
    expect(
      buyItem(
        S({
          balance: 1000,
          totalClicks: 20,
          ownedSkins: ["soft-shadow"],
          enabledSkins: ["soft-shadow"],
        }),
        "soft-shadow",
      ),
    ).toEqual({ ok: false, reason: "owned" });
    expect(buyItem(S({ balance: 1000, totalClicks: 250 }), "triple-click")).toEqual({
      ok: false,
      reason: "requires",
    });
    expect(buyItem(S({ balance: 14, totalClicks: 10 }), "soft-shadow")).toEqual({
      ok: false,
      reason: "unaffordable",
    });
    expect(buyItem(S({ balance: 99999, totalClicks: 150, levels: { crit: 3 } }), "crit")).toEqual({
      ok: false,
      reason: "maxed",
    });
  });

  it("Input is not mutated", () => {
    const first = deepFreeze(S({ balance: 20, totalClicks: 12 }));
    const second = deepFreeze(S({ balance: 1000, totalClicks: 700, helpers: { monkey: 1 } }));
    const results: BuyResult[] = [];
    expect(() => {
      results.push(buyItem(first, "soft-shadow"));
      results.push(buyItem(second, "crit"));
      results.push(buyItem(second, "combo"));
      results.push(buyItem(second, "speed-monkey"));
    }).not.toThrow();
    expect(first).toEqual(S({ balance: 20, totalClicks: 12 }));
    expect(second).toEqual(S({ balance: 1000, totalClicks: 700, helpers: { monkey: 1 } }));
    for (const result of results) {
      expect(result.ok).toBe(true);
      expect(result.ok ? result.state : undefined).not.toBe(first);
      expect(result.ok ? result.state : undefined).not.toBe(second);
    }
  });
});
