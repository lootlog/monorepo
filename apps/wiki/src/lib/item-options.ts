import { itemStatValue } from "@lootlog/domain/item-stat";
import { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import { t } from "@/i18n/messages";

export const RARITY_OPTIONS = [
  DisplayItemRarity.UNIQUE,
  DisplayItemRarity.HEROIC,
  DisplayItemRarity.UPGRADED,
  DisplayItemRarity.LEGENDARY,
] as const;

export const PROFESSION_OPTIONS = ["w", "p", "h", "m", "b", "t"] as const;

export const findRequiredProfessions = (stat: string) => {
  const required = itemStatValue(stat, "reqp") ?? "";

  return PROFESSION_OPTIONS.filter((profession) =>
    required.includes(profession),
  );
};

export const ITEM_TYPE_OPTIONS = [
  "ONE_HAND_WEAPON",
  "TWO_HAND_WEAPON",
  "ONE_AND_HALF_HAND_WEAPON",
  "DISTANCE_WEAPON",
  "HELP_WEAPON",
  "WAND_WEAPON",
  "ORB_WEAPON",
  "ARMOR",
  "HELMET",
  "BOOTS",
  "GLOVES",
  "RING",
  "NECKLACE",
  "SHIELD",
  "QUIVER",
  "NEUTRAL",
  "CONSUME",
  "OUTFITS",
  "PETS",
  "TELEPORTS",
  "GOLD",
  "KEYS",
  "QUEST",
  "RENEWABLE",
  "BOOK",
  "BAG",
  "BLESS",
  "UPGRADE",
  "RECIPE",
  "COINAGE",
] as const;

export const ITEM_TILE_LABELS = {
  rarity: Object.fromEntries(
    [DisplayItemRarity.COMMON, ...RARITY_OPTIONS].map((rarity) => [
      rarity,
      t(`itemRarity.${rarity}`),
    ]),
  ),
  type: Object.fromEntries(
    ITEM_TYPE_OPTIONS.map((type) => [type, t(`itemType.${type}`)]),
  ),
  upgradeLevel: t("upgrade.label"),
};
