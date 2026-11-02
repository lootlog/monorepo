const numberFormatter = new Intl.NumberFormat("pl-PL");

/** Formats a count or amount with Polish digit grouping. */
export const formatNumber = (value: number): string =>
  numberFormatter.format(value);
