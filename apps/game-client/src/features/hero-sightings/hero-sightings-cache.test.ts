import { beforeEach, expect, it } from "vitest";
import {
  getHeroSightingsControllerGetHeroSightingHistoryQueryKey,
  type HeroSightingResponseDto,
} from "@lootlog/client/main";
import { queryKeys } from "@/features/public-api/query-keys";
import { queryClient } from "@/lib/query-client";
import { createHeroSighting } from "./hero-sighting-fixtures";
import { upsertHeroSightings } from "./hero-sightings-cache";

const listed = () =>
  queryClient.getQueryData<HeroSightingResponseDto[]>(
    queryKeys.heroSightings("luvia"),
  );

beforeEach(() => {
  queryClient.clear();
  queryClient.setQueryData(queryKeys.heroSightings("luvia"), [
    createHeroSighting(),
    createHeroSighting({ guildId: "guild-2" }),
  ]);
});

it("keeps the replacing sighting when its closed predecessor is delivered after it", () => {
  const replacement = createHeroSighting({ id: 2, mapName: "Nithal" });

  upsertHeroSightings(queryClient, [replacement]);
  upsertHeroSightings(queryClient, [
    createHeroSighting({
      closedAt: "2026-11-03T12:05:00.000Z",
      closeReason: "PROBABLY_KILLED",
    }),
  ]);

  expect(listed()).toEqual([
    replacement,
    createHeroSighting({ guildId: "guild-2" }),
  ]);
});

it("does not start a partial list for a world that was never loaded", () => {
  upsertHeroSightings(queryClient, [
    createHeroSighting({ id: 3, world: "aldous" }),
  ]);

  expect(
    queryClient.getQueryData(queryKeys.heroSightings("aldous")),
  ).toBeUndefined();
});

it("refreshes the hero's history only in the Lootlog whose sighting changed", () => {
  const historyKey = (guildId: string) =>
    getHeroSightingsControllerGetHeroSightingHistoryQueryKey(
      { guildId },
      { world: "luvia", hero: "tepeyollotl" },
    );

  queryClient.setQueryData(historyKey("guild-1"), []);
  queryClient.setQueryData(historyKey("guild-2"), []);

  upsertHeroSightings(queryClient, [createHeroSighting()]);

  expect(queryClient.getQueryState(historyKey("guild-1"))?.isInvalidated).toBe(
    true,
  );
  expect(queryClient.getQueryState(historyKey("guild-2"))?.isInvalidated).toBe(
    false,
  );
});
