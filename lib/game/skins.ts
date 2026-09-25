import { getShopItem } from "./shop";
import type {
  GetButtonAppearance,
  IsSkinActive,
  MaterialSkinId,
  SkinId,
  StackSkinId,
  ToggleSkin,
} from "./types";

/** True for Gold, the only skin in the exclusive material slot in Stage 2. */
function isMaterialSkin(id: SkinId): boolean {
  const item = getShopItem(id);
  return item.kind === "skin" && item.slot === "material";
}

export const toggleSkin: ToggleSkin = (state, id) => {
  if (!state.ownedSkins.includes(id)) {
    return state;
  }

  // The material slot is exclusive: toggling Gold off falls back to the classic button (design D7).
  if (isMaterialSkin(id)) {
    return { ...state, material: state.material === id ? "classic" : (id as MaterialSkinId) };
  }

  const stackId = id as StackSkinId;
  const enabled = new Set<StackSkinId>(state.enabledSkins);
  if (enabled.has(stackId)) {
    enabled.delete(stackId);
  } else {
    enabled.add(stackId);
  }
  return {
    ...state,
    // ownedSkins is already in catalog order, so filtering it keeps enabledSkins ordered too.
    enabledSkins: state.ownedSkins.filter((owned): owned is StackSkinId =>
      enabled.has(owned as StackSkinId),
    ),
  };
};

export const isSkinActive: IsSkinActive = (state, id) =>
  isMaterialSkin(id) ? state.material === id : state.enabledSkins.includes(id as StackSkinId);

export const getButtonAppearance: GetButtonAppearance = (state) => ({
  stack: state.enabledSkins,
  material: state.material,
});
