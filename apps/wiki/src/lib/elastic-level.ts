import { clamp } from "es-toolkit";
import { itemAtLevel } from "@/lib/item-upgrade";

/**
 * Margonem's elastic items (`lvladjust`), from the game's rules at
 * https://pomoc.margonem.pl/index/view,372: an item looted by a character
 * takes the highest level of its class's ladder not above the character's,
 * from 40 to 300. The ladder climbs in fives, and each class ends its levels
 * in its own digits: weapons in 0 and 5, armor in 2 and 7, jewelry in 1 and 6.
 */

const MIN_LEVEL = 40;

const MAX_LEVEL = 300;

const LADDER_STEP = 5;

const ARMOR_TYPES = new Set(["ARMOR", "HELMET", "GLOVES", "BOOTS"]);

const JEWELRY_TYPES = new Set(["RING", "NECKLACE"]);

/** The remainder by five of the levels on the item class's ladder. */
const ladderOffset = (type: string | null) => {
  if (ARMOR_TYPES.has(type ?? "")) return 2;

  if (JEWELRY_TYPES.has(type ?? "")) return 1;

  return 0;
};

/**
 * The level an elastic item of this type has when a character of
 * `characterLevel` loots it. Characters past 300 all get level 300, which
 * lies on no armor or jewelry ladder.
 */
export const elasticItemLevel = (
  type: string | null,
  characterLevel: number,
) => {
  if (characterLevel >= MAX_LEVEL) return MAX_LEVEL;

  const offset = ladderOffset(type);
  const below = (characterLevel - offset) % LADDER_STEP;

  return clamp(characterLevel - below, MIN_LEVEL, MAX_LEVEL);
};

type ElasticItem = Parameters<typeof itemAtLevel>[0] & {
  /** Whether the catalog saw the item at its looters' levels. */
  elasticLevel?: boolean;
};

/**
 * The item as a character of `characterLevel` would loot it; an item of
 * fixed level keeps the version the catalog saw. Without a character level an
 * elastic item shows at 300, its one version that does not depend on who
 * looted it last.
 */
export const itemForCharacter = <Item extends ElasticItem>(
  item: Item,
  characterLevel: number | null,
): Item =>
  item.elasticLevel
    ? itemAtLevel(
        item,
        elasticItemLevel(item.type, characterLevel ?? MAX_LEVEL),
      )
    : item;
