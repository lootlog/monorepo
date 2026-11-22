import type { CatalogDropSourceDtoOutput } from "@lootlog/client/catalog";
import {
  getSharedDropChance,
  isMultiRollType,
} from "@lootlog/domain/loot-rolls";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

type DropRate = NonNullable<CatalogDropSourceDtoOutput["dropRate"]>;

export const FULL_PARTY_SIZE = 10;

const rateFormat = new Intl.NumberFormat(PRODUCT_LOCALE, {
  style: "percent",
  maximumSignificantDigits: 2,
});

export const formatChance = (chance: number) => rateFormat.format(chance);

export const getRollChance = ({ drops, rolls }: DropRate) => drops / rolls;

export const getFullPartyChance = (
  rate: DropRate,
  npcType: string | null,
): number | null =>
  rate.lootMode === "SHARED" && isMultiRollType(npcType)
    ? getSharedDropChance(getRollChance(rate), FULL_PARTY_SIZE)
    : null;
