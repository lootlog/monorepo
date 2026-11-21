import {
  ItemTypeEnum as ItemType,
  type ItemTypeEnum as ItemTypeValue,
} from "@lootlog/schema/loot";
import { parseItemStatEntries } from "./item-stat.js";

const ITEM_TYPES = new Map<number, ItemTypeValue>([
  [1, ItemType.ONE_HAND_WEAPON],
  [2, ItemType.TWO_HAND_WEAPON],
  [3, ItemType.ONE_AND_HALF_HAND_WEAPON],
  [4, ItemType.DISTANCE_WEAPON],
  [5, ItemType.HELP_WEAPON],
  [6, ItemType.WAND_WEAPON],
  [7, ItemType.ORB_WEAPON],
  [8, ItemType.ARMOR],
  [9, ItemType.HELMET],
  [10, ItemType.BOOTS],
  [11, ItemType.GLOVES],
  [12, ItemType.RING],
  [13, ItemType.NECKLACE],
  [14, ItemType.SHIELD],
  [15, ItemType.NEUTRAL],
  [16, ItemType.CONSUME],
  [17, ItemType.GOLD],
  [18, ItemType.KEYS],
  [19, ItemType.QUEST],
  [20, ItemType.RENEWABLE],
  [21, ItemType.ARROWS],
  [22, ItemType.TALISMAN],
  [23, ItemType.BOOK],
  [24, ItemType.BAG],
  [25, ItemType.BLESS],
  [26, ItemType.UPGRADE],
  [27, ItemType.RECIPE],
  [28, ItemType.COINAGE],
  [29, ItemType.QUIVER],
  [30, ItemType.OUTFITS],
  [31, ItemType.PETS],
  [32, ItemType.TELEPORTS],
]);

export const getItemTypeByCl = (cl: number): ItemTypeValue | undefined => {
  return ITEM_TYPES.get(cl);
};

/**
 * Lootlog counts an item of legendary rarity in two ways. Counters of
 * legendary items (statistics tiles, rarity charts, a loot's rarity summary,
 * the public stats card) count every one. A legend is a legendary find worth
 * listing: the legend lists and rankings leave out these types, which drop as
 * legendary blessings, upgrades and consumables rather than equipment.
 */
export const NON_LEGEND_ITEM_TYPES = [
  ItemType.BLESS,
  ItemType.UPGRADE,
  ItemType.CONSUME,
] as const satisfies readonly ItemTypeValue[];

/** Item types that fit one of Margonem's nine equipment slots, including blessings. */
const EQUIPPABLE_ITEM_TYPES = [
  ItemType.ONE_HAND_WEAPON,
  ItemType.TWO_HAND_WEAPON,
  ItemType.ONE_AND_HALF_HAND_WEAPON,
  ItemType.DISTANCE_WEAPON,
  ItemType.HELP_WEAPON,
  ItemType.WAND_WEAPON,
  ItemType.ORB_WEAPON,
  ItemType.ARMOR,
  ItemType.HELMET,
  ItemType.BOOTS,
  ItemType.GLOVES,
  ItemType.RING,
  ItemType.NECKLACE,
  ItemType.SHIELD,
  ItemType.QUIVER,
  ItemType.BLESS,
] as const satisfies readonly ItemTypeValue[];

const EQUIPPABLE_ITEM_TYPE_SET = new Set<string>(EQUIPPABLE_ITEM_TYPES);

export const isEquippableItemType = (type: string | null | undefined) =>
  type !== null && type !== undefined && EQUIPPABLE_ITEM_TYPE_SET.has(type);

/**
 * Coarse browse categories of catalog items:
 * - `equipment`: wearable gear meant to be equipped in combat;
 * - `crafting`: equipment-slot items meant only as crafting/upgrade ingredients
 *   (e.g. Chochoł or Marzanna drops with high `artisanbon` and no combat stats);
 * - `other`: non-equippable items such as keys, bags, consumables, and quests.
 */
export const ITEM_CATEGORIES = ["equipment", "crafting", "other"] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/** Combat stats that distinguish real wearable gear from pure crafting fodder. */
const COMBAT_STAT_KEYS = new Set([
  "da",
  "ds",
  "dz",
  "di",
  "hp",
  "hpbon",
  "sa",
  "crit",
  "critval",
  "critmval",
  "pierce",
  "pierceb",
  "dmgmulabsolute",
  "acdmg",
  "resdmg",
  "abdest",
  "lowevade",
  "slow",
  "fire",
  "light",
  "frost",
  "poison",
  "wound",
  "pdmg",
  "evade",
  "blok",
  "lowcrit",
  "heal",
  "adest",
  "absorb",
  "absorbm",
  "resfire",
  "reslight",
  "resfrost",
  "act",
  "manadest",
  "endest",
  "manabon",
  "energybon",
  "contra",
  "parry",
  "legbon",
  "socket_content",
  "bonus",
]);

const CRAFTING_FODDER_DESCRIPTION = /surowiec do użycia w rzemiośle/iu;

const isCraftingIngredient = (stat: string): boolean => {
  let artisanBonus = 0;
  let hasCombatStat = false;
  let hasCraftingDescription = false;

  for (const { key, value } of parseItemStatEntries(stat)) {
    if (key === "artisanbon" && value !== true) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) artisanBonus = parsed;
      continue;
    }

    if (key === "opis" && value !== true) {
      if (CRAFTING_FODDER_DESCRIPTION.test(value)) {
        hasCraftingDescription = true;
      }

      continue;
    }

    if (COMBAT_STAT_KEYS.has(key)) {
      hasCombatStat = true;
    }
  }

  return hasCraftingDescription || (artisanBonus > 100 && !hasCombatStat);
};

export const classifyItemCategory = (item: {
  readonly type: string | null | undefined;
  readonly stat: string;
}): ItemCategory => {
  if (!isEquippableItemType(item.type)) return "other";

  if (isCraftingIngredient(item.stat)) return "crafting";

  return "equipment";
};
