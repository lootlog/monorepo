import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

const longDay = new Intl.DateTimeFormat(PRODUCT_LOCALE, {
  dateStyle: "long",
  timeZone: "UTC",
});

const shortDay = new Intl.DateTimeFormat(PRODUCT_LOCALE, {
  dateStyle: "short",
  timeZone: "UTC",
});

const monthOfYear = new Intl.DateTimeFormat(PRODUCT_LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/;

export const formatCatalogDay = (day: string) =>
  longDay.format(new Date(`${day}T00:00:00Z`));

export const formatCatalogDayShort = (day: string) =>
  shortDay.format(new Date(`${day}T00:00:00Z`));

export const isCatalogMonth = (value: unknown): value is string =>
  MONTH.test(String(value ?? ""));

export const formatCatalogMonth = (month: string) =>
  monthOfYear.format(new Date(`${month}-01T00:00:00Z`));

export const latestCatalogMonths = (count: number, now = new Date()) =>
  Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index))
      .toISOString()
      .slice(0, 7),
  );
