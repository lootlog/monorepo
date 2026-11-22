export const PRODUCT_LOCALE = "pl-PL";

const collator = new Intl.Collator(PRODUCT_LOCALE);

export const comparePolish = (left: string, right: string): number =>
  collator.compare(left, right);

const numberFormatter = new Intl.NumberFormat(PRODUCT_LOCALE);

export const formatNumber = (value: number): string =>
  numberFormatter.format(value);

const decimalFormatter = new Intl.NumberFormat(PRODUCT_LOCALE, {
  maximumFractionDigits: 2,
});

export const formatDecimal = (value: number): string =>
  decimalFormatter.format(value);
