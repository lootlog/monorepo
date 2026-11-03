import { beforeEach, expect, it } from "vitest";
import type { HeroSighting } from "@/api/hero-sightings.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { queryClient } from "@/lib/query-client";
import { createHeroSighting } from "./hero-sighting-fixtures";
import { upsertHeroSightings } from "./hero-sightings-cache";

const listed = () =>
  queryClient.getQueryData<HeroSighting[]>(queryKeys.heroSightings("luvia"));

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
