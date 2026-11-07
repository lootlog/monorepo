import type { CatalogDropSourceDtoOutput } from "@lootlog/client/catalog";
import {
  getSharedDropChance,
  isMultiRollType,
} from "@lootlog/domain/loot-rolls";

type DropRate = NonNullable<CatalogDropSourceDtoOutput["dropRate"]>;

/** The party a full-party chance is shown for. */
export const FULL_PARTY_SIZE = 10;

const rateFormat = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumSignificantDigits: 2,
});

/** A chance such as `9,7%`. */
export const formatChance = (chance: number) => rateFormat.format(chance);

/** The chance one loot roll drops the item. */
export const getRollChance = ({ drops, rolls }: DropRate) => drops / rolls;

/**
 * The chance a kill by a full party that survives drops the item at least
 * once; none for a boss that rolls once or gives everyone a loot of their own.
 */
export const getFullPartyChance = (
  rate: DropRate,
  npcType: string | null,
): number | null =>
  rate.lootMode === "SHARED" && isMultiRollType(npcType)
    ? getSharedDropChance(getRollChance(rate), FULL_PARTY_SIZE)
    : null;
