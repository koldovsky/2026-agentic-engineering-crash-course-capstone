import { useId } from "react";
import { formatNumber } from "@/lib/i18n";
import {
  getItemLevel,
  getItemPrice,
  getItemStatus,
  getRevealedItems,
  getShopItem,
} from "@/lib/game/shop";
import { isSkinActive } from "@/lib/game/skins";
import type {
  GameState,
  ShopCategory,
  ShopItem,
  ShopItemId,
  SkinId,
  SkinItem,
} from "@/lib/game/types";
import { usePreferences } from "./PreferencesProvider";
import type { TranslationKey } from "@/lib/i18n";

interface ShopBoxProps {
  readonly state: GameState;
  readonly onBuy: (item: ShopItem) => void;
  readonly onToggle: (id: SkinId) => void;
}

/** Display order; "video" is the Stage 4 category and is always rendered last (design D4). */
const CATEGORIES: readonly ShopCategory[] = ["skins", "decor", "upgrades", "video"];

const CATEGORY_LABELS: Record<ShopCategory, TranslationKey> = {
  skins: "shop.category.skins",
  decor: "shop.category.decor",
  upgrades: "shop.category.upgrades",
  video: "shop.category.video",
};

function nameKey(id: ShopItemId): TranslationKey {
  return `item.${id}.name` as TranslationKey;
}

function descriptionKey(id: ShopItemId): TranslationKey {
  return `item.${id}.description` as TranslationKey;
}

/**
 * The shop box (design D15): fixed top-left so revealing items never shifts the centered column,
 * scrolling internally once it grows past 60 % of the viewport height.
 */
export function ShopBox({ state, onBuy, onToggle }: ShopBoxProps) {
  const { t, language } = usePreferences();
  const revealed = getRevealedItems(state);

  return (
    <section
      data-testid="shop"
      aria-label={t("shop.title")}
      className="fixed left-4 top-4 z-20 max-h-[60vh] w-72 overflow-y-auto rounded-2xl border border-foreground/10 bg-background/90 p-4 text-sm shadow-lg backdrop-blur"
    >
      <h2 className="text-base font-semibold">{t("shop.title")}</h2>

      {CATEGORIES.map((category) => {
        const items = revealed.filter((item) => item.category === category);
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={category} className="mt-3">
            <h3
              data-testid={`shop-category-${category}`}
              className="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              {t(CATEGORY_LABELS[category])}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {items.map((item) => (
                <ShopRow
                  key={item.id}
                  item={item}
                  state={state}
                  price={formatNumber(getItemPrice(state, item.id), language)}
                  onBuy={onBuy}
                  onToggle={onToggle}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

interface ShopRowProps {
  readonly item: ShopItem;
  readonly state: GameState;
  readonly price: string;
  readonly onBuy: (item: ShopItem) => void;
  readonly onToggle: (id: SkinId) => void;
}

/**
 * One catalog item. The item name gets an id so the controls can reference it with
 * `aria-describedby`: their visible text ("Купити за N", "Увімкнено") repeats across rows.
 */
function ShopRow(props: ShopRowProps) {
  const { t } = usePreferences();
  const nameId = useId();
  const { item } = props;

  return (
    <li data-testid={`shop-item-${item.id}`} className="flex flex-col gap-1">
      <span id={nameId} className="font-medium">
        {t(nameKey(item.id))}
      </span>
      <span className="text-xs text-muted">{t(descriptionKey(item.id))}</span>
      <ShopItemControls {...props} nameId={nameId} />
    </li>
  );
}

interface ShopItemControlsProps extends ShopRowProps {
  /** Id of the item name element, referenced by `aria-describedby`. */
  readonly nameId: string;
}

/** Buy button, skin toggle, owned / requires / count / level label — one row per item (D15/D18). */
function ShopItemControls({ item, state, price, onBuy, onToggle, nameId }: ShopItemControlsProps) {
  const { t, language } = usePreferences();
  const status = getItemStatus(state, item.id);

  if (status === "owned") {
    if (item.kind === "skin") {
      return <SkinToggle item={item} state={state} onToggle={onToggle} nameId={nameId} />;
    }
    return (
      <span data-testid={`shop-owned-${item.id}`} className="text-xs font-medium text-muted">
        {t("shop.owned")}
      </span>
    );
  }

  const owned = item.kind === "helper" ? state.helpers[item.id] : 0;
  // Leveled upgrades show their level instead of a count, and lose the buy button at max (D18).
  const level = item.kind === "leveled-upgrade" ? getItemLevel(state, item.id) : 0;
  const levelLabel = item.kind === "leveled-upgrade" && level > 0 && (
    <span data-testid={`shop-level-${item.id}`} className="text-xs text-muted">
      {t("shop.level", {
        level: formatNumber(level, language),
        max: formatNumber(item.maxLevel, language),
      })}
    </span>
  );

  if (status === "maxed") {
    return (
      <div className="flex flex-col gap-1">
        {levelLabel}
        <span data-testid={`shop-maxed-${item.id}`} className="text-xs font-medium text-muted">
          {t("shop.maxed")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {status === "requires" && item.kind === "click-upgrade" && item.requires !== null && (
        <span data-testid={`shop-requires-${item.id}`} className="text-xs text-muted">
          {t("shop.requires", { item: t(nameKey(getShopItem(item.requires).id)) })}
        </span>
      )}
      {levelLabel}
      {owned > 0 && (
        <span data-testid={`shop-count-${item.id}`} className="text-xs text-muted">
          {t("shop.count", { count: formatNumber(owned, language) })}
        </span>
      )}
      <button
        type="button"
        data-testid={`shop-buy-${item.id}`}
        disabled={status !== "available"}
        aria-describedby={nameId}
        onClick={() => onBuy(item)}
        className="self-start rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-50"
      >
        {t("shop.buy", { price })}
      </button>
    </div>
  );
}

function SkinToggle({
  item,
  state,
  onToggle,
  nameId,
}: {
  readonly item: SkinItem;
  readonly state: GameState;
  readonly onToggle: (id: SkinId) => void;
  readonly nameId: string;
}) {
  const { t } = usePreferences();
  const active = isSkinActive(state, item.id);

  return (
    <button
      type="button"
      data-testid={`skin-toggle-${item.id}`}
      aria-pressed={active}
      aria-describedby={nameId}
      onClick={() => onToggle(item.id)}
      className="self-start rounded-full border border-foreground/20 px-3 py-1 text-xs font-medium"
    >
      {active ? t("skin.on") : t("skin.off")}
    </button>
  );
}
