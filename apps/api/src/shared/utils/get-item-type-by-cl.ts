import { ItemType } from '@prisma/client';

const ITEM_TYPES = {
  1: ItemType.ONE_HAND_WEAPON,
  2: ItemType.TWO_HAND_WEAPON,
  3: ItemType.ONE_AND_HALF_HAND_WEAPON,
  4: ItemType.DISTANCE_WEAPON,
  5: ItemType.HELP_WEAPON,
  6: ItemType.WAND_WEAPON,
  7: ItemType.ORB_WEAPON,
  8: ItemType.ARMOR,
  9: ItemType.HELMET,
  10: ItemType.BOOTS,
  11: ItemType.GLOVES,
  12: ItemType.RING,
  13: ItemType.NECKLACE,
  14: ItemType.SHIELD,
  15: ItemType.NEUTRAL,
  16: ItemType.CONSUME,
  17: ItemType.GOLD,
  18: ItemType.KEYS,
  19: ItemType.QUEST,
  20: ItemType.RENEWABLE,
  21: ItemType.ARROWS,
  22: ItemType.TALISMAN,
  23: ItemType.BOOK,
  24: ItemType.BAG,
  25: ItemType.BLESS,
  26: ItemType.UPGRADE,
  27: ItemType.RECIPE,
  28: ItemType.COINAGE,
  29: ItemType.QUIVER,
  30: ItemType.OUTFITS,
  31: ItemType.PETS,
  32: ItemType.TELEPORTS,
};

export const getItemTypeByCl = (cl: number): ItemType => {
  return ITEM_TYPES[cl] ?? undefined;
};
