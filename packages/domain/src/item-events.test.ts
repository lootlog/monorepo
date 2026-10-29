import { describe, expect, it } from "bun:test";
import { catalogSlug } from "./catalog-slug.js";
import {
  itemEventLabels,
  itemEventSlug,
  latestItemEvent,
} from "./item-events.js";

describe("item events", () => {
  it("names the latest year of an item that came back, whatever order the game lists them in", () => {
    expect(
      latestItemEvent(
        itemEventLabels("20. Urodziny Margonem 2026 r.\n|Halloween 2021 r."),
      ),
    ).toBe("20. Urodziny Margonem 2026 r.");
    expect(
      latestItemEvent(
        itemEventLabels(
          "Wielkanoc 2024 r.|Wielkanoc 2025 r.|Wielkanoc 2026 r.",
        ),
      ),
    ).toBe("Wielkanoc 2026 r.");
    expect(latestItemEvent(itemEventLabels("Dzień Młodego Smoka"))).toBe(
      "Dzień Młodego Smoka",
    );
  });

  it("gives each event a readable slug without the year's `r.`", () => {
    expect(itemEventSlug("Wakacje 2026 r.")).toBe("wakacje-2026");
    expect(itemEventSlug("20. Urodziny Margonem 2026 r.")).toBe(
      "20-urodziny-margonem-2026",
    );
    expect(itemEventSlug("Dzień Koźca Mąciciela Ścieżek")).toBe(
      "dzien-kozca-maciciela-sciezek",
    );
  });
});

describe("catalog slugs", () => {
  it("keeps Polish letters readable instead of dropping them", () => {
    expect(catalogSlug("Łowczyni Wspomnień")).toBe("lowczyni-wspomnien");
    expect(catalogSlug("Żmij Ćwierćgłowy")).toBe("zmij-cwiercglowy");
  });
});
