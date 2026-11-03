import { expect, it } from "vitest";
import {
  createHeroSighting,
  createHeroSightingMember,
} from "./hero-sighting-fixtures";
import { projectHeroSightingRows } from "./hero-sighting-rows";

const claimBy = (userId: string, memberId: number) => ({
  member: createHeroSightingMember({ userId, memberId }),
  character: null,
  createdAt: "2026-11-03T12:01:00.000Z",
});

const sightings = [
  createHeroSighting({ claims: [claimBy("user-2", 2)] }),
  // The same User claims the same hero through a second Organization.
  createHeroSighting({
    id: 9,
    guildId: "guild-2",
    firstSeenAt: "2026-11-03T12:02:00.000Z",
    detectedBy: createHeroSightingMember({ displayName: "Later" }),
    claims: [claimBy("user-2", 7)],
  }),
];

it("merges one hero's sightings across Organizations while grouping, counting each claimer once", () => {
  const [row, ...rest] = projectHeroSightingRows(sightings, {
    guildId: "guild-1",
    isGrouping: true,
  });

  expect(rest).toHaveLength(0);
  expect(row?.sightings).toHaveLength(2);
  expect(row?.claims).toHaveLength(1);
  expect(row?.detectedBy.displayName).toBe("Detector");
});

it("shows only the selected Lootlog's sightings while grouping is off", () => {
  const rows = projectHeroSightingRows(sightings, {
    guildId: "guild-2",
    isGrouping: false,
  });

  expect(rows.map((row) => row.sightings.map((entry) => entry.id))).toEqual([
    [9],
  ]);
});
