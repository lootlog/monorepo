import { clamp } from "es-toolkit";
import { itemAtLevel } from "./item-upgrade.js";

export const ELASTIC_LEVELS = { min: 40, max: 300 } as const;

export const MAX_FIXED_LEVELS = 4;

const LADDER_STEP = 5;

const ARMOR_TYPES = new Set(["ARMOR", "HELMET", "GLOVES", "BOOTS"]);

const JEWELRY_TYPES = new Set(["RING", "NECKLACE"]);

const ladderOffset = (type: string | null) => {
  if (ARMOR_TYPES.has(type ?? "")) return 2;

  if (JEWELRY_TYPES.has(type ?? "")) return 1;

  return 0;
};

export const elasticItemLevel = (
  type: string | null,
  characterLevel: number,
) => {
  if (characterLevel >= ELASTIC_LEVELS.max) return ELASTIC_LEVELS.max;

  const offset = ladderOffset(type);
  const below = (characterLevel - offset) % LADDER_STEP;

  return clamp(characterLevel - below, ELASTIC_LEVELS.min, ELASTIC_LEVELS.max);
};

type ElasticItem = Parameters<typeof itemAtLevel>[0] & {
  elasticLevel?: boolean;
};

export const itemForCharacter = <Item extends ElasticItem>(
  item: Item,
  characterLevel: number | null,
): Item =>
  item.elasticLevel
    ? itemAtLevel(
        item,
        elasticItemLevel(item.type, characterLevel ?? ELASTIC_LEVELS.max),
      )
    : item;
