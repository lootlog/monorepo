/** The language Lootlog formats, sorts and searches player-facing text in. */
export const PRODUCT_LOCALE = "pl-PL";

const collator = new Intl.Collator(PRODUCT_LOCALE);

/** Orders text the way a Polish reader expects, with `Ł` right after `L`. */
export const comparePolish = (left: string, right: string): number =>
  collator.compare(left, right);

const numberFormatter = new Intl.NumberFormat(PRODUCT_LOCALE);

/** A count or amount with Polish digit grouping. */
export const formatNumber = (value: number): string =>
  numberFormatter.format(value);

const decimalFormatter = new Intl.NumberFormat(PRODUCT_LOCALE, {
  maximumFractionDigits: 2,
});

/** A measured value with Polish grouping and at most two decimals: `1 234,57`. */
export const formatDecimal = (value: number): string =>
  decimalFormatter.format(value);
