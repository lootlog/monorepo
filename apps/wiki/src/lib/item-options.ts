import { ItemRarity } from "@lootlog/ui/lib/item-rarity";
import { t } from "@/i18n/messages";

/** Rarities a search can filter by; common items have no rarity. */
export const RARITY_OPTIONS = [
  ItemRarity.UNIQUE,
  ItemRarity.HEROIC,
  ItemRarity.UPGRADED,
  ItemRarity.LEGENDARY,
] as const;

export const PROFESSION_OPTIONS = ["w", "p", "h", "m", "b", "t"] as const;

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

/** The labels `ItemTile` shows in an item's tooltip. */
export const ITEM_TILE_LABELS = {
  rarity: Object.fromEntries(
    [ItemRarity.COMMON, ...RARITY_OPTIONS].map((rarity) => [
      rarity,
      t(`itemRarity.${rarity}`),
    ]),
  ),
  type: Object.fromEntries(
    ITEM_TYPE_OPTIONS.map((type) => [type, t(`itemType.${type}`)]),
  ),
};

const firstSeenFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A catalog day, `YYYY-MM-DD`, as players read it. */
export const formatFirstSeenOn = (day: string) =>
  firstSeenFormatter.format(new Date(`${day}T12:00:00Z`));
