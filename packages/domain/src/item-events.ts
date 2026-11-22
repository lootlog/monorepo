import { maxBy } from "es-toolkit";
import { catalogSlug } from "./catalog-slug.js";

const EVENT_YEAR = /\b(\d{4})\b/;

export const itemEventLabels = (etiquette: string) =>
  etiquette
    .split("|")
    .map((label) => label.trim())
    .filter((label) => label !== "");

export const latestItemEvent = (labels: readonly string[]) =>
  maxBy(labels, (label) => Number(EVENT_YEAR.exec(label)?.[1] ?? 0));

export const itemEventSlug = (label: string) =>
  catalogSlug(label.endsWith(" r.") ? label.slice(0, -3) : label);

const EDITION_SLUG = /^(?:\d+-)?(.+)-(\d{4})$/u;

const EVENT_ENDS = new Map([
  ["urodziny-margonem", "03-11"],
  ["walentynki", "02-17"],
  ["pierwszy-dzien-wiosny", "03-28"],
  ["wielkanoc", "04-28"],
  ["dzien-dziecka", "06-03"],
  ["noc-kupaly", "06-29"],
  ["przesilenie-letnie", "06-30"],
  ["wakacje", "09-01"],
  ["swieto-plonow", "09-22"],
  ["grzybobranie", "10-13"],
  ["halloween", "11-06"],
  ["gwiazdka", "01-07"],
]);

const EVENTS_ENDING_NEXT_YEAR = new Set(["gwiazdka"]);

const itemEventEditionEnd = (slug: string) => {
  const edition = EDITION_SLUG.exec(slug);

  if (!edition) return undefined;

  const [, event = "", year = ""] = edition;
  const end = EVENT_ENDS.get(event);

  if (end === undefined) return `${year}-12-31`;

  return `${EVENTS_ENDING_NEXT_YEAR.has(event) ? Number(year) + 1 : year}-${end}`;
};

export const isEventEditionAvailableSince = (
  slug: string,
  openedOn: string,
) => {
  const end = itemEventEditionEnd(slug);

  return end === undefined || end > openedOn;
};
