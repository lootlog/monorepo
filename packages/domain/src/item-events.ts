import { maxBy } from "es-toolkit";
import { catalogSlug } from "./catalog-slug.js";

const EVENT_YEAR = /\b(\d{4})\b/;

/**
 * The events an item's `etiquette` stat names, as the game writes them, such
 * as `Wakacje 2026 r.` or `Dzień Młodego Smoka`. An item that came back lists
 * each year of its event.
 */
export const itemEventLabels = (etiquette: string) =>
  etiquette
    .split("|")
    .map((label) => label.trim())
    .filter((label) => label !== "");

/**
 * The latest of an item's events. The game lists the years in no fixed order,
 * so the latest year wins; labels without one keep the first listed.
 */
export const latestItemEvent = (labels: readonly string[]) =>
  maxBy(labels, (label) => Number(EVENT_YEAR.exec(label)?.[1] ?? 0));

/** An event's URL slug, without the year's `r.`: `wakacje-2026`. */
export const itemEventSlug = (label: string) =>
  catalogSlug(label.endsWith(" r.") ? label.slice(0, -3) : label);

// An edition's slug: an optional anniversary number, the event and its year,
// such as `20-urodziny-margonem-2026`.
const EDITION_SLUG = /^(?:\d+-)?(.+)-(\d{4})$/u;

/**
 * The morning each yearly event ends, as `MM-DD`, by the slug of its name,
 * from Margonem's announcements. The game moves its events by a few days
 * each year, so each day is the latest end of the 2025 and 2026 editions.
 * Noc Kupały 2026 ended on the morning Luvia opened, without reaching it.
 */
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
  // Gwiazdka starts in December and ends in the next year's January.
  ["gwiazdka", "01-07"],
]);

const EVENTS_ENDING_NEXT_YEAR = new Set(["gwiazdka"]);

/**
 * The day an event edition ends, as `YYYY-MM-DD`; none for an event without
 * a year, which comes back. An event the schedule does not know ends with
 * its year, so its items show rather than hide.
 */
export const itemEventEditionEnd = (slug: string) => {
  const edition = EDITION_SLUG.exec(slug);

  if (!edition) return undefined;

  const [, event = "", year = ""] = edition;
  const end = EVENT_ENDS.get(event);

  if (end === undefined) return `${year}-12-31`;

  return `${EVENTS_ENDING_NEXT_YEAR.has(event) ? Number(year) + 1 : year}-${end}`;
};

/**
 * Whether a character on a world opened on `openedOn` (`YYYY-MM-DD`) can get
 * an edition's items: the edition ended after that day. Events end in the
 * morning and worlds open later in the day, so one ending on the opening
 * day never reaches the world.
 */
export const isEventEditionAvailableSince = (
  slug: string,
  openedOn: string,
) => {
  const end = itemEventEditionEnd(slug);

  return end === undefined || end > openedOn;
};
