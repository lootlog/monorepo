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

it("marks a claimer as the detector only where they are the same member of that Organization", () => {
  const detector = createHeroSightingMember({ userId: "user-5", memberId: 5 });

  const [row] = projectHeroSightingRows(
    [
      // In guild-1, member 5 is someone else than guild-2's member 5.
      createHeroSighting({ claims: [claimBy("user-3", 5)] }),
      createHeroSighting({
        id: 9,
        guildId: "guild-2",
        detectedBy: detector,
        claims: [claimBy("user-5", 5)],
      }),
    ],
    { guildId: "guild-1", isGrouping: true },
  );

  expect(
    row?.claims.map(({ member, isDetector }) => [member.userId, isDetector]),
  ).toEqual([
    ["user-3", false],
    ["user-5", true],
  ]);
});

it("names who confirmed the hero last unless the detector did, across Organizations", () => {
  const detector = createHeroSightingMember({ userId: "user-1", memberId: 1 });
  const friend = createHeroSightingMember({ userId: "user-2", memberId: 2 });

  const project = (lastSeenBy: typeof detector) =>
    projectHeroSightingRows(
      [
        createHeroSighting({ detectedBy: detector, lastSeenBy: detector }),
        // The detector's later confirmation through a second Organization.
        createHeroSighting({
          id: 9,
          guildId: "guild-2",
          lastSeenAt: "2026-11-03T12:30:00.000Z",
          detectedBy: friend,
          lastSeenBy: { ...lastSeenBy, memberId: 7 },
        }),
      ],
      { guildId: "guild-1", isGrouping: true },
    )[0];

  expect(project(friend)?.refreshedBy?.userId).toBe("user-2");
  expect(project(detector)?.refreshedBy).toBeNull();
});
