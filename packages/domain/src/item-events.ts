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
