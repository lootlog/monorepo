import { describe, expect, it } from "bun:test";
import { catalogSlug } from "./catalog-slug.js";
import {
  isEventEditionAvailableSince,
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

describe("event editions a world saw", () => {
  const luvia = "2026-06-29";

  it("keeps editions that ended after a world opened and leaves out the ones before", () => {
    expect(isEventEditionAvailableSince("wakacje-2026", luvia)).toBe(true);
    expect(isEventEditionAvailableSince("wielkanoc-2026", luvia)).toBe(false);
    expect(
      isEventEditionAvailableSince("20-urodziny-margonem-2026", luvia),
    ).toBe(false);
    expect(isEventEditionAvailableSince("halloween-2025", luvia)).toBe(false);
  });

  it("leaves out an edition that ended on the morning the world opened", () => {
    expect(isEventEditionAvailableSince("noc-kupaly-2026", luvia)).toBe(false);
  });

  it("keeps Gwiazdka for a world opened in the January it runs into", () => {
    expect(isEventEditionAvailableSince("gwiazdka-2025", "2026-01-02")).toBe(
      true,
    );
  });

  it("keeps events without a year, which come back, and an unknown event of the world's year", () => {
    expect(isEventEditionAvailableSince("dzien-mlodego-smoka", luvia)).toBe(
      true,
    );
    expect(isEventEditionAvailableSince("majowka-2026", luvia)).toBe(true);
  });
});

describe("catalog slugs", () => {
  it("keeps Polish letters readable instead of dropping them", () => {
    expect(catalogSlug("Łowczyni Wspomnień")).toBe("lowczyni-wspomnien");
    expect(catalogSlug("Żmij Ćwierćgłowy")).toBe("zmij-cwiercglowy");
  });
});
