import { describe, expect, it } from "vitest";
import type { Timer } from "@/hooks/api/use-timers";
import {
  mergeTimers,
  calculateTimeLeft,
  filterTimersByRemovalTime,
  filterTimersByGuild,
  filterTimersByVisibility,
  filterTimersBySearchText,
  filterTimersByNpcType,
  filterTimersByLevel,
  filterTimersByColor,
  sortTimersByPinnedAndTime,
  type TimerWithTimeLeft,
} from "./timers-utils";
import { NpcType } from "@/hooks/api/use-npcs";
import {
  createMockTimer,
  createMockTimerWithTimeLeft,
} from "../__tests__/test-helpers";

describe("timers-utils", () => {
  describe("mergeTimers", () => {
    it("should merge timers with same npcId", () => {
      const maxTime1 = new Date("2024-01-01T10:00:00Z");
      const minTime1 = new Date("2024-01-01T09:00:00Z");
      const maxTime2 = new Date("2024-01-01T11:00:00Z");
      const minTime2 = new Date("2024-01-01T10:00:00Z");

      const timers: Timer[] = [
        createMockTimer({
          npcId: 1,
          npc: {
            id: 1,
            name: "Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          member: {
            id: 1,
            name: "Player1",
            guildId: "guild1",
            userId: "user1",
            type: "member",
          },
          maxSpawnTime: maxTime1,
          minSpawnTime: minTime1,
        }),
        createMockTimer({
          npcId: 1,
          npc: {
            id: 1,
            name: "Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          member: {
            id: 2,
            name: "Player2",
            guildId: "guild1",
            userId: "user2",
            type: "member",
          },
          maxSpawnTime: maxTime2,
          minSpawnTime: minTime2,
        }),
      ];

      const result = mergeTimers(timers);

      expect(result.length).toBe(1);
      expect(result[0].members?.length).toBe(2);
      expect(result[0].maxSpawnTime).toEqual(maxTime2);
    });

    it("should keep separate timers with different npcIds", () => {
      const maxTime1 = new Date("2024-01-01T10:00:00Z");
      const maxTime2 = new Date("2024-01-01T11:00:00Z");

      const timers: Timer[] = [
        createMockTimer({
          npcId: 1,
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: maxTime1,
        }),
        createMockTimer({
          npcId: 2,
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: maxTime2,
        }),
      ];

      const result = mergeTimers(timers);

      expect(result.length).toBe(2);
    });

    it("should merge manual timers with same name and world but different npcIds and guildIds", () => {
      const maxTime1 = new Date("2024-01-01T10:00:00Z");
      const minTime1 = new Date("2024-01-01T09:00:00Z");
      const maxTime2 = new Date("2024-01-01T11:00:00Z");
      const minTime2 = new Date("2024-01-01T10:00:00Z");
      const maxTime3 = new Date("2024-01-01T12:00:00Z");
      const minTime3 = new Date("2024-01-01T11:00:00Z");
      const maxTime4 = new Date("2024-01-01T13:00:00Z");
      const minTime4 = new Date("2024-01-01T12:00:00Z");
      const maxTime5 = new Date("2024-01-01T14:00:00Z");
      const minTime5 = new Date("2024-01-01T13:00:00Z");

      const timers: Timer[] = [
        createMockTimer({
          npcId: 1,
          guildId: "guild1",
          world: "world1",
          npc: {
            id: 1,
            name: "Manual Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 999,
          },
          member: {
            id: 1,
            name: "Player1",
            guildId: "guild1",
            userId: "user1",
            type: "member",
          },
          maxSpawnTime: maxTime1,
          minSpawnTime: minTime1,
        }),
        createMockTimer({
          npcId: 2,
          guildId: "guild2",
          world: "world1",
          npc: {
            id: 2,
            name: "Manual Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 999,
          },
          member: {
            id: 2,
            name: "Player2",
            guildId: "guild2",
            userId: "user2",
            type: "member",
          },
          maxSpawnTime: maxTime2,
          minSpawnTime: minTime2,
        }),
        createMockTimer({
          npcId: 3,
          guildId: "guild3",
          world: "world1",
          npc: {
            id: 3,
            name: "Manual Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 999,
          },
          member: {
            id: 3,
            name: "Player3",
            guildId: "guild3",
            userId: "user3",
            type: "member",
          },
          maxSpawnTime: maxTime3,
          minSpawnTime: minTime3,
        }),
        createMockTimer({
          npcId: 4,
          guildId: "guild4",
          world: "world1",
          npc: {
            id: 4,
            name: "Manual Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 999,
          },
          member: {
            id: 4,
            name: "Player4",
            guildId: "guild4",
            userId: "user4",
            type: "member",
          },
          maxSpawnTime: maxTime4,
          minSpawnTime: minTime4,
        }),
        createMockTimer({
          npcId: 5,
          guildId: "guild5",
          world: "world1",
          npc: {
            id: 5,
            name: "Manual Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 999,
          },
          member: {
            id: 5,
            name: "Player5",
            guildId: "guild5",
            userId: "user5",
            type: "member",
          },
          maxSpawnTime: maxTime5,
          minSpawnTime: minTime5,
        }),
      ];

      const result = mergeTimers(timers);

      expect(result.length).toBe(1);
      expect(result[0].members?.length).toBe(5);
      expect(result[0].maxSpawnTime).toEqual(maxTime5);
      expect(result[0].npc.name).toBe("Manual Boss");
      expect(result[0].npc.margonemType).toBe(999);
    });

    it("should merge 5 timers with same npcId but different guildIds", () => {
      const maxTime1 = new Date("2024-01-01T10:00:00Z");
      const minTime1 = new Date("2024-01-01T09:00:00Z");
      const maxTime2 = new Date("2024-01-01T11:00:00Z");
      const minTime2 = new Date("2024-01-01T10:00:00Z");
      const maxTime3 = new Date("2024-01-01T12:00:00Z");
      const minTime3 = new Date("2024-01-01T11:00:00Z");
      const maxTime4 = new Date("2024-01-01T13:00:00Z");
      const minTime4 = new Date("2024-01-01T12:00:00Z");
      const maxTime5 = new Date("2024-01-01T14:00:00Z");
      const minTime5 = new Date("2024-01-01T13:00:00Z");

      const timers: Timer[] = [
        createMockTimer({
          npcId: 1,
          guildId: "guild1",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 1,
            name: "Player1",
            guildId: "guild1",
            userId: "user1",
            type: "member",
          },
          maxSpawnTime: maxTime1,
          minSpawnTime: minTime1,
          wasReset: false,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild2",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 2,
            name: "Player2",
            guildId: "guild2",
            userId: "user2",
            type: "member",
          },
          maxSpawnTime: maxTime2,
          minSpawnTime: minTime2,
          wasReset: false,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild3",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 3,
            name: "Player3",
            guildId: "guild3",
            userId: "user3",
            type: "member",
          },
          maxSpawnTime: maxTime3,
          minSpawnTime: minTime3,
          wasReset: false,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild4",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 4,
            name: "Player4",
            guildId: "guild4",
            userId: "user4",
            type: "member",
          },
          maxSpawnTime: maxTime4,
          minSpawnTime: minTime4,
          wasReset: false,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild5",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 5,
            name: "Player5",
            guildId: "guild5",
            userId: "user5",
            type: "member",
          },
          maxSpawnTime: maxTime5,
          minSpawnTime: minTime5,
          wasReset: false,
          isPending: false,
        }),
      ];

      const result = mergeTimers(timers);

      expect(result.length).toBe(1);
      expect(result[0].members?.length).toBe(5);
      expect(result[0].maxSpawnTime).toEqual(maxTime5);
      expect(result[0].minSpawnTime).toEqual(minTime5);
      expect(result[0].npc.name).toBe("Dragon Boss");
      expect(result[0].npc.lvl).toBe(150);
      expect(result[0].guildId).toBe("guild5");
      expect(result[0].world).toBe("world1");
      expect(result[0].members?.map((m) => m.name)).toEqual([
        "Player1",
        "Player2",
        "Player3",
        "Player4",
        "Player5",
      ]);
    });

    it("should keep reset timer separate from non-reset timers with same npcId", () => {
      const resetTime = new Date("2024-01-01T08:00:00Z");
      const resetMinTime = new Date("2024-01-01T07:00:00Z");
      const regularTime1 = new Date("2024-01-01T10:00:00Z");
      const regularMinTime1 = new Date("2024-01-01T09:00:00Z");
      const regularTime2 = new Date("2024-01-01T11:00:00Z");
      const regularMinTime2 = new Date("2024-01-01T10:00:00Z");
      const regularTime3 = new Date("2024-01-01T12:00:00Z");
      const regularMinTime3 = new Date("2024-01-01T11:00:00Z");
      const regularTime4 = new Date("2024-01-01T13:00:00Z");
      const regularMinTime4 = new Date("2024-01-01T12:00:00Z");

      const timers: Timer[] = [
        createMockTimer({
          npcId: 1,
          guildId: "guild1",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 1,
            name: "Player1",
            guildId: "guild1",
            userId: "user1",
            type: "member",
          },
          maxSpawnTime: regularTime1,
          minSpawnTime: regularMinTime1,
          wasReset: false,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild2",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 2,
            name: "Player2",
            guildId: "guild2",
            userId: "user2",
            type: "member",
          },
          maxSpawnTime: regularTime2,
          minSpawnTime: regularMinTime2,
          wasReset: false,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild3",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 3,
            name: "Player3",
            guildId: "guild3",
            userId: "user3",
            type: "member",
          },
          maxSpawnTime: resetTime,
          minSpawnTime: resetMinTime,
          wasReset: true,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild4",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 4,
            name: "Player4",
            guildId: "guild4",
            userId: "user4",
            type: "member",
          },
          maxSpawnTime: regularTime3,
          minSpawnTime: regularMinTime3,
          wasReset: false,
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild5",
          world: "world1",
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "dragon.png",
            wt: 3600,
            margonemType: 1,
          },
          member: {
            id: 5,
            name: "Player5",
            guildId: "guild5",
            userId: "user5",
            type: "member",
          },
          maxSpawnTime: regularTime4,
          minSpawnTime: regularMinTime4,
          wasReset: false,
          isPending: false,
        }),
      ];

      const result = mergeTimers(timers);

      expect(result.length).toBe(2);

      const resetTimer = result.find((t) => t.wasReset);
      const regularTimer = result.find((t) => !t.wasReset);

      expect(resetTimer).toBeDefined();
      expect(regularTimer).toBeDefined();

      expect(resetTimer?.members?.length).toBe(1);
      expect(resetTimer?.members?.[0].name).toBe("Player3");
      expect(resetTimer?.maxSpawnTime).toEqual(resetTime);
      expect(resetTimer?.wasReset).toBe(true);

      expect(regularTimer?.members?.length).toBe(4);
      expect(regularTimer?.members?.map((m) => m.name)).toEqual([
        "Player1",
        "Player2",
        "Player4",
        "Player5",
      ]);
      expect(regularTimer?.maxSpawnTime).toEqual(regularTime4);
      expect(regularTimer?.wasReset).toBe(false);
    });
  });

  describe("calculateTimeLeft", () => {
    it("should calculate time left for timers", () => {
      const now = Date.now();
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: new Date(now + 3600000),
          minSpawnTime: new Date(now + 1800000),
          maxTimeLeft: 0,
          minTimeLeft: 0,
        }),
      ];

      const result = calculateTimeLeft(timers);

      expect(result[0].maxTimeLeft).toBeGreaterThan(3500000);
      expect(result[0].minTimeLeft).toBeGreaterThan(1700000);
    });
  });

  describe("filterTimersByRemovalTime", () => {
    it("should filter out timers past removal time", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxTimeLeft: 1000,
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxTimeLeft: -10000,
        }),
      ];

      const result = filterTimersByRemovalTime(timers, 5000);

      expect(result.length).toBe(1);
      expect(result[0].npc.name).toBe("Boss1");
    });
  });

  describe("filterTimersByGuild", () => {
    it("should filter timers by guild id", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          guildId: "guild1",
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          guildId: "guild2",
        }),
      ];

      const result = filterTimersByGuild(timers, "guild1");

      expect(result.length).toBe(1);
      expect(result[0].guildId).toBe("guild1");
    });
  });

  describe("filterTimersByVisibility", () => {
    it("should show all timers when showHiddenTimers is true", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersByVisibility(timers, ["Boss1"], true);

      expect(result.length).toBe(2);
    });

    it("should hide timers in hiddenTimers array when showHiddenTimers is false", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersByVisibility(timers, ["Boss1"], false);

      expect(result.length).toBe(1);
      expect(result[0].npc.name).toBe("Boss2");
    });
  });

  describe("filterTimersBySearchText", () => {
    it("should filter timers by search text", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Orc Warrior",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersBySearchText(timers, "dragon");

      expect(result.length).toBe(1);
      expect(result[0].npc.name).toBe("Dragon Boss");
    });

    it("should return all timers when search text is empty", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Dragon Boss",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Orc Warrior",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersBySearchText(timers, "");

      expect(result.length).toBe(2);
    });
  });

  describe("filterTimersByNpcType", () => {
    it("should filter timers by NPC type", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Elite1",
            type: NpcType.ELITE,
            lvl: 50,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersByNpcType(timers, [NpcType.HERO]);

      expect(result.length).toBe(1);
      expect(result[0].npc.type).toBe(NpcType.HERO);
    });

    it("should include level 0 NPCs regardless of type", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 0,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersByNpcType(timers, [NpcType.ELITE]);

      expect(result.length).toBe(1);
    });

    it("should include NPC type regardless of filter", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "NPC1",
            type: NpcType.NPC,
            lvl: 50,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersByNpcType(timers, [NpcType.HERO]);

      expect(result.length).toBe(1);
    });
  });

  describe("filterTimersByLevel", () => {
    it("should filter timers by level range", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 50,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 3,
            name: "Boss3",
            type: NpcType.HERO,
            lvl: 150,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersByLevel(timers, 50, 100);

      expect(result.length).toBe(2);
    });

    it("should include level 0 NPCs regardless of range", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 0,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];

      const result = filterTimersByLevel(timers, 50, 100);

      expect(result.length).toBe(1);
    });
  });

  describe("filterTimersByColor", () => {
    it("should filter timers by color", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];
      const timersColors = { Boss1: "red", Boss2: "blue" };

      const result = filterTimersByColor(timers, ["red"], timersColors);

      expect(result.length).toBe(1);
      expect(result[0].npc.name).toBe("Boss1");
    });

    it("should return all timers when no colors selected", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      ];
      const timersColors = { Boss1: "red", Boss2: "blue" };

      const result = filterTimersByColor(timers, [], timersColors);

      expect(result.length).toBe(2);
    });
  });

  describe("sortTimersByPinnedAndTime", () => {
    it("should place pinned timers first", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: new Date("2024-01-01T10:00:00Z"),
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: new Date("2024-01-01T11:00:00Z"),
        }),
      ];

      const result = sortTimersByPinnedAndTime(timers, ["Boss2"], "asc");

      expect(result[0].npc.name).toBe("Boss2");
    });

    it("should sort by time ascending when sortOrder is asc", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: new Date("2024-01-01T12:00:00Z"),
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: new Date("2024-01-01T10:00:00Z"),
        }),
      ];

      const result = sortTimersByPinnedAndTime(timers, [], "asc");

      expect(result[0].npc.name).toBe("Boss2");
    });

    it("should sort by time descending when sortOrder is desc", () => {
      const timers: TimerWithTimeLeft[] = [
        createMockTimerWithTimeLeft({
          npc: {
            id: 1,
            name: "Boss1",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: new Date("2024-01-01T10:00:00Z"),
        }),
        createMockTimerWithTimeLeft({
          npc: {
            id: 2,
            name: "Boss2",
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
          maxSpawnTime: new Date("2024-01-01T12:00:00Z"),
        }),
      ];

      const result = sortTimersByPinnedAndTime(timers, [], "desc");

      expect(result[0].npc.name).toBe("Boss2");
    });
  });
});
