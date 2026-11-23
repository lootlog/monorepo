import { expect, it } from "vitest";
import {
  createHeroSighting,
  createHeroSightingMember,
} from "@/test/hero-sighting-fixtures";
import {
  isWithdrawableHeroSighting,
  projectHeroSightingRows,
} from "./hero-sighting-rows";

const claimBy = (userId: string, memberId: number) => ({
  member: createHeroSightingMember({ userId, memberId }),
  character: null,
  createdAt: "2026-11-03T12:01:00.000Z",
});

const sightings = [
  createHeroSighting({ claims: [claimBy("user-2", 2)] }),
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

it("names who confirmed the hero last unless the detector did, across Organizations", () => {
  const detector = createHeroSightingMember({ userId: "user-1", memberId: 1 });
  const friend = createHeroSightingMember({ userId: "user-2", memberId: 2 });

  const project = (lastSeenBy: typeof detector) =>
    projectHeroSightingRows(
      [
        createHeroSighting({ detectedBy: detector, lastSeenBy: detector }),
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

it("lists a hero that will spawn above a roaming one confirmed later, ended sightings last", () => {
  const hero = (name: string) => ({
    key: name,
    name,
    lvl: 258,
    prof: null,
  });

  const rows = projectHeroSightingRows(
    [
      createHeroSighting({
        id: 1,
        hero: hero("ended"),
        state: "SPAWNING",
        lastSeenAt: "2026-11-03T12:50:00.000Z",
        closedAt: "2026-11-03T12:55:00.000Z",
      }),
      createHeroSighting({
        id: 2,
        hero: hero("roaming"),
        lastSeenAt: "2026-11-03T12:30:00.000Z",
      }),
      createHeroSighting({ id: 3, hero: hero("spawning"), state: "SPAWNING" }),
    ],
    { guildId: "guild-1", isGrouping: false },
  );

  expect(rows.map((row) => row.hero.key)).toEqual([
    "spawning",
    "roaming",
    "ended",
  ]);
});

it("lets only the author remove a sighting, and only while it is open and still entered by hand", () => {
  const own = createHeroSighting({ manual: true });

  const removable = [
    own,
    createHeroSighting({ manual: false }),
    createHeroSighting({ manual: true, closedAt: "2026-11-03T13:00:00.000Z" }),
    createHeroSighting({
      manual: true,
      detectedBy: createHeroSightingMember({ userId: "user-2" }),
    }),
  ].filter((sighting) => isWithdrawableHeroSighting(sighting, "user-1"));

  expect(removable).toEqual([own]);
  expect(isWithdrawableHeroSighting(own, undefined)).toBe(false);
});
