import type { Timer } from "@/api/timers.api";
import { NpcType } from "@/api/npcs.api";
import { describe, expect, it } from "vitest";
import { projectTimerList } from "./timer-list-projection";

type ProjectionInput = Parameters<typeof projectTimerList>[0];

const createTimer = (overrides: Partial<Timer> = {}): Timer => ({
  guildId: "guild-1",
  timerKey: "timer-1",
  world: "pandora",
  npcId: 10,
  minSpawnTime: "2099-04-22T10:00:00.000Z",
  maxSpawnTime: "2099-04-22T10:05:00.000Z",
  updatedAt: "2099-04-22T09:59:00.000Z",
  wasReset: false,
  npc: {
    id: 10,
    name: "Tanroth",
    lvl: 120,
    prof: "W",
    icon: "icon.gif",
    wt: 10,
    type: NpcType.HERO,
    margonemType: 4,
    location: "Ruins",
  } as never,
  ...overrides,
});

const createProjectionInput = (
  overrides: Partial<ProjectionInput> = {},
): ProjectionInput => ({
  context: {
    guildId: "guild-1",
    isGrouping: false,
  },
  epoch: new Date("2099-04-22T09:00:00.000Z").getTime(),
  filters: {
    maxLvl: 300,
    minLvl: 0,
    searchText: "",
    selectedColors: [],
    selectedNpcTypes: [
      NpcType.HERO,
      NpcType.ELITE2,
      NpcType.ELITE3,
      NpcType.TITAN,
    ],
    showHiddenTimers: false,
  },
  preferences: {
    alwaysVisibleExpiredTimers: {},
    colorFiltersEnabled: false,
    customColors: {},
    defaultColorNames: {},
    hiddenTimers: [],
    overriddenDefaultColors: {},
    pinnedTimers: [],
    removeTimerAfterMs: 30_000,
    sortOrder: "asc",
    timersColors: {},
  },
  timers: [],
  ...overrides,
});

describe("projectTimerList", () => {
  it("returns render-ready ungrouped Timer state through one interface", () => {
    const member = { id: 77, name: "Alderaan" };
    const actorCharacter = { id: "character-77", name: "Alderaan" };
    const result = projectTimerList(
      createProjectionInput({
        filters: {
          maxLvl: 300,
          minLvl: 0,
          searchText: "tan",
          selectedColors: [],
          selectedNpcTypes: [
            NpcType.HERO,
            NpcType.ELITE2,
            NpcType.ELITE3,
            NpcType.TITAN,
          ],
          showHiddenTimers: false,
        },
        preferences: {
          alwaysVisibleExpiredTimers: {},
          colorFiltersEnabled: true,
          customColors: {},
          defaultColorNames: { red: "Red" },
          hiddenTimers: [],
          overriddenDefaultColors: {},
          pinnedTimers: [],
          removeTimerAfterMs: 30_000,
          sortOrder: "asc",
          timersColors: { Tanroth: "red" },
        },
        timers: [
          createTimer(),
          createTimer({
            actorCharacter: actorCharacter as never,
            member: member as never,
            updatedAt: "2099-04-22T09:59:01.000Z",
          }),
        ],
      }),
    );

    expect(result).toEqual({
      areFiltersActive: true,
      colorStatistics: [
        expect.objectContaining({
          active: 1,
          color: "red",
          name: "Red",
          total: 1,
        }),
      ],
      timers: [
        expect.objectContaining({
          actorCharactersByMemberId: { "77": actorCharacter },
          maxTimeLeft: 3_900_000,
          members: [member],
          minTimeLeft: 3_600_000,
          updatedAt: "2099-04-22T09:59:01.000Z",
        }),
      ],
    });
  });

  it("groups shared Timers while keeping manual Timers separate by world", () => {
    const alice = { id: 1, name: "Alice" };
    const bob = { id: 2, name: "Bob" };
    const result = projectTimerList(
      createProjectionInput({
        context: { guildId: "guild-1", isGrouping: true },
        timers: [
          createTimer({
            guildId: "guild-1",
            member: alice as never,
            maxSpawnTime: "2099-04-22T10:05:00.000Z",
            timerKey: "tanroth",
          }),
          createTimer({
            guildId: "guild-2",
            member: bob as never,
            maxSpawnTime: "2099-04-22T10:10:00.000Z",
            timerKey: "tanroth",
          }),
          createTimer({
            timerKey: "manual-pandora",
            world: "pandora",
            npc: {
              ...createTimer().npc,
              margonemType: 999,
              name: "Manual",
            },
          }),
          createTimer({
            timerKey: "manual-gefion",
            world: "gefion",
            npc: {
              ...createTimer().npc,
              margonemType: 999,
              name: "Manual",
            },
          }),
        ],
      }),
    );

    expect(result.timers).toHaveLength(3);
    expect(result.timers).toContainEqual(
      expect.objectContaining({
        guildId: "guild-2",
        members: [alice, bob],
        mergedGuildIds: [
          { guildId: "guild-1", npcId: 10, timerKey: "tanroth" },
          { guildId: "guild-2", npcId: 10, timerKey: "tanroth" },
        ],
      }),
    );
    expect(
      result.timers.filter((timer) => timer.npc.name === "Manual"),
    ).toHaveLength(2);
  });

  it("applies Organization, visibility, search, NPC, level, and color filters", () => {
    const timers = [
      createTimer(),
      createTimer({
        guildId: "guild-2",
        timerKey: "partner",
      }),
      createTimer({
        timerKey: "hidden",
        npc: { ...createTimer().npc, name: "Hidden Tanroth" },
      }),
      createTimer({
        timerKey: "wrong-level",
        npc: { ...createTimer().npc, lvl: 80, name: "Young Tanroth" },
      }),
      createTimer({
        timerKey: "npc",
        npc: {
          ...createTimer().npc,
          lvl: 0,
          name: "Tanroth mailbox",
          type: NpcType.NPC,
        },
      }),
    ];
    const result = projectTimerList(
      createProjectionInput({
        filters: {
          ...createProjectionInput().filters,
          maxLvl: 130,
          minLvl: 100,
          searchText: "tanroth",
          selectedColors: ["red"],
          selectedNpcTypes: [NpcType.HERO],
        },
        preferences: {
          ...createProjectionInput().preferences,
          colorFiltersEnabled: true,
          hiddenTimers: ["Hidden Tanroth"],
          timersColors: {
            Tanroth: "red",
            "Tanroth mailbox": "red",
            "Young Tanroth": "red",
          },
        },
        timers,
      }),
    );

    expect(result.timers.map((timer) => timer.npc.name)).toEqual([
      "Tanroth",
      "Tanroth mailbox",
    ]);
  });

  it("keeps configured expired Timers and sorts pinned and expired Timers compatibly", () => {
    const epoch = new Date("2099-04-22T10:00:00.000Z").getTime();
    const result = projectTimerList(
      createProjectionInput({
        epoch,
        preferences: {
          ...createProjectionInput().preferences,
          alwaysVisibleExpiredTimers: { pandora: ["always-visible"] },
          pinnedTimers: ["Pinned"],
        },
        timers: [
          createTimer({
            timerKey: "expired-manual",
            maxSpawnTime: "2099-04-22T09:59:00.000Z",
            npc: {
              ...createTimer().npc,
              margonemType: 999,
              name: "Manual expired",
            },
          }),
          createTimer({
            timerKey: "always-visible",
            maxSpawnTime: "2099-04-22T09:59:00.000Z",
            npc: { ...createTimer().npc, name: "Always visible" },
          }),
          createTimer({
            timerKey: "pinned",
            maxSpawnTime: "2099-04-22T10:03:00.000Z",
            npc: { ...createTimer().npc, name: "Pinned" },
          }),
          createTimer({
            timerKey: "active",
            maxSpawnTime: "2099-04-22T10:01:00.000Z",
            npc: { ...createTimer().npc, name: "Active" },
          }),
        ],
      }),
    );

    expect(result.timers.map((timer) => timer.npc.name)).toEqual([
      "Pinned",
      "Active",
      "Always visible",
    ]);
  });

  it("derives color statistics from visible Timers and all configured assignments", () => {
    const result = projectTimerList(
      createProjectionInput({
        preferences: {
          ...createProjectionInput().preferences,
          customColors: {
            custom: {
              backgroundColor: "#111111",
              borderColor: "#222222",
              id: "custom",
              name: "Custom",
            },
          },
          defaultColorNames: { red: "Crimson" },
          overriddenDefaultColors: {
            red: { backgroundColor: "#333333", borderColor: "#444444" },
          },
          timersColors: {
            Hidden: "custom",
            Tanroth: "red",
          },
        },
        timers: [createTimer()],
      }),
    );

    expect(result.colorStatistics).toEqual([
      expect.objectContaining({
        active: 1,
        bgColor: "#333333",
        borderColor: "#444444",
        color: "red",
        name: "Crimson",
        total: 1,
      }),
      expect.objectContaining({
        active: 0,
        color: "custom",
        name: "Custom",
        total: 1,
      }),
    ]);
  });

  it.each([
    ["defaults", {}, false],
    ["search", { searchText: "tan" }, true],
    ["level", { minLvl: 100 }, true],
    ["NPC types", { selectedNpcTypes: [NpcType.HERO] }, true],
    ["colors", { selectedColors: ["red"] }, true],
  ])("detects active filters for %s", (_name, filterOverrides, expected) => {
    const result = projectTimerList(
      createProjectionInput({
        filters: {
          ...createProjectionInput().filters,
          ...filterOverrides,
        },
      }),
    );

    expect(result.areFiltersActive).toBe(expected);
  });
});
