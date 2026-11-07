import type { CatalogDropSourceDtoOutput } from "@lootlog/client/catalog";

type DropRate = NonNullable<CatalogDropSourceDtoOutput["dropRate"]>;

const rateFormat = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  maximumSignificantDigits: 2,
});

/** The share of a boss's kills that dropped the item, such as `9,7%`. */
export const formatDropRate = ({ drops, kills }: DropRate) =>
  rateFormat.format(drops / kills);
