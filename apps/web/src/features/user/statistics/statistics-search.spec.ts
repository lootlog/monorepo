import { describe, expect, it } from "vitest";
import { parseStatisticsSearch } from "./statistics-search";
import { getKillsControllerGetUserKillAnalyticsQueryKey } from "@lootlog/client/main";

describe("statistics URL", () => {
  it("defaults malformed filters and preserves valid reload state", () => {
    expect(
      parseStatisticsSearch({ days: "bogus", tab: "bad", world: 12 }),
    ).toEqual({ days: 30, tab: "overview", world: undefined });
    expect(
      parseStatisticsSearch({ days: "90", tab: "worlds", world: " Pandora " }),
    ).toEqual({ days: 90, tab: "worlds", world: "Pandora" });
  });
  it("isolates cached period and world data", () => {
    const all = getKillsControllerGetUserKillAnalyticsQueryKey({ days: "30" });
    expect(all).not.toEqual(
      getKillsControllerGetUserKillAnalyticsQueryKey({ days: "7" }),
    );
    expect(all).not.toEqual(
      getKillsControllerGetUserKillAnalyticsQueryKey({
        days: "30",
        world: "pandora",
      }),
    );
  });
});
