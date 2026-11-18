const longDay = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "long",
  timeZone: "UTC",
});

const shortDay = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeZone: "UTC",
});

const monthOfYear = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/;

/** A catalog day (`YYYY-MM-DD`, UTC) as Polish writes it: `7 listopada 2026`. */
export const formatCatalogDay = (day: string) =>
  longDay.format(new Date(`${day}T00:00:00Z`));

/** A catalog day in a row with little room: `7.11.2026`. */
export const formatCatalogDayShort = (day: string) =>
  shortDay.format(new Date(`${day}T00:00:00Z`));

/** Whether the value is a month as the catalog filters by it: `YYYY-MM`. */
export const isCatalogMonth = (value: unknown): value is string =>
  MONTH.test(String(value ?? ""));

/** A catalog month (`YYYY-MM`) by its name: `listopad 2026`. */
export const formatCatalogMonth = (month: string) =>
  monthOfYear.format(new Date(`${month}-01T00:00:00Z`));

/** The latest `count` months, the current one first, as the catalog filters by them. */
export const latestCatalogMonths = (count: number, now = new Date()) =>
  Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index))
      .toISOString()
      .slice(0, 7),
  );
