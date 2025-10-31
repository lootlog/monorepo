import { describe, expect, it } from "vitest";
import type { Timer } from "@/hooks/api/use-timers";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import type { Guild } from "@/hooks/api/use-guild";
import { NpcType } from "@/hooks/api/use-npcs";
import {
  getLevelSuffix,
  getTimerMembers,
  getMembersWithGuilds,
  calculateTimeLeft,
  getTimerColorConfig,
} from "./timer-helpers";
import { createMockTimer } from "../__tests__/test-helpers";

describe("timer-helpers", () => {
  describe("getLevelSuffix", () => {
    it("should return empty string for level 0", () => {
      const npc = {
        id: 1,
        name: "Boss",
        type: NpcType.HERO,
        lvl: 0,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      };
      expect(getLevelSuffix(npc)).toBe("");
    });

    it("should return formatted level suffix for non-zero level", () => {
      const npc = {
        id: 1,
        name: "Boss",
        type: NpcType.HERO,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      };
      expect(getLevelSuffix(npc)).toBe(" (50w)");
    });

    it("should handle missing profession", () => {
      const npc = {
        id: 1,
        name: "Boss",
        type: NpcType.HERO,
        lvl: 50,
        prof: "",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      };
      expect(getLevelSuffix(npc)).toBe(" (50)");
    });

    it("should lowercase first character of profession", () => {
      const npc = {
        id: 1,
        name: "Boss",
        type: NpcType.HERO,
        lvl: 100,
        prof: "Warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      };
      expect(getLevelSuffix(npc)).toBe(" (100w)");
    });
  });

  describe("getTimerMembers", () => {
    it("should return members array if it exists and has items", () => {
      const timer = createMockTimer({
        members: [
          {
            id: 1,
            name: "Player1",
            guildId: "guild1",
            userId: "user1",
            type: "member",
          },
          {
            id: 2,
            name: "Player2",
            guildId: "guild2",
            userId: "user2",
            type: "member",
          },
        ],
      });
      expect(getTimerMembers(timer)).toEqual(timer.members);
    });

    it("should return single member as array if members is empty but member exists", () => {
      const member = {
        id: 1,
        name: "Player1",
        guildId: "guild1",
        userId: "user1",
        type: "member",
      } as GuildMember;
      const timer = createMockTimer({ members: [], member });
      expect(getTimerMembers(timer)).toEqual([member]);
    });

    it("should return empty array if no members exist", () => {
      const timer = createMockTimer({ members: undefined, member: undefined });
      expect(getTimerMembers(timer)).toEqual([]);
    });
  });

  describe("getMembersWithGuilds", () => {
    it("should format members with guild names", () => {
      const members: GuildMember[] = [
        {
          id: 1,
          name: "Player1",
          guildId: "guild1",
          userId: "user1",
          type: "member",
        } as GuildMember,
        {
          id: 2,
          name: "Player2",
          guildId: "guild2",
          userId: "user2",
          type: "member",
        } as GuildMember,
      ];
      const guilds: Guild[] = [
        { id: "guild1", name: "Guild One" } as Guild,
        { id: "guild2", name: "Guild Two" } as Guild,
      ];

      const result = getMembersWithGuilds(members, guilds);
      expect(result).toBe("Player1 (Guild One), Player2 (Guild Two)");
    });

    it("should show only member name if guild not found", () => {
      const members: GuildMember[] = [
        {
          id: 1,
          name: "Player1",
          guildId: "guild1",
          userId: "user1",
          type: "member",
        } as GuildMember,
      ];
      const guilds: Guild[] = [];

      const result = getMembersWithGuilds(members, guilds);
      expect(result).toBe("Player1");
    });

    it("should handle undefined guilds", () => {
      const members: GuildMember[] = [
        {
          id: 1,
          name: "Player1",
          guildId: "guild1",
          userId: "user1",
          type: "member",
        } as GuildMember,
      ];

      const result = getMembersWithGuilds(members, undefined);
      expect(result).toBe("Player1");
    });
  });

  describe("calculateTimeLeft", () => {
    it("should return maxTimeLeft when countdownMode is max", () => {
      const result = calculateTimeLeft(1000, 2000, "max", false);
      expect(result).toBe(2000);
    });

    it("should return maxTimeLeft when isMinSpawnTime is true regardless of countdownMode", () => {
      const result = calculateTimeLeft(1000, 2000, "min", true);
      expect(result).toBe(2000);
    });

    it("should return minTimeLeft when countdownMode is min and not min spawn time", () => {
      const result = calculateTimeLeft(1000, 2000, "min", false);
      expect(result).toBe(1000);
    });
  });

  describe("getTimerColorConfig", () => {
    it("should return selected color and null custom/overridden when color is default", () => {
      const timersColors = { "Boss NPC": "red" };
      const customColors = {};
      const overriddenDefaultColors = {};

      const result = getTimerColorConfig(
        "Boss NPC",
        timersColors,
        customColors,
        overriddenDefaultColors,
      );

      expect(result.selectedColor).toBe("red");
      expect(result.customColor).toBeUndefined();
      expect(result.overriddenColor).toBeUndefined();
    });

    it("should return custom color when selected color is custom", () => {
      const customColor = {
        id: "custom1",
        name: "Custom Red",
        backgroundColor: "#ff0000",
        borderColor: "#cc0000",
      };
      const timersColors = { "Boss NPC": "custom1" };
      const customColors = { custom1: customColor };
      const overriddenDefaultColors = {};

      const result = getTimerColorConfig(
        "Boss NPC",
        timersColors,
        customColors,
        overriddenDefaultColors,
      );

      expect(result.selectedColor).toBe("custom1");
      expect(result.customColor).toEqual(customColor);
      expect(result.overriddenColor).toBeUndefined();
    });

    it("should return overridden color when default color is overridden", () => {
      const overriddenColor = {
        backgroundColor: "#ff0000",
        borderColor: "#cc0000",
      };
      const timersColors = { "Boss NPC": "red" };
      const customColors = {};
      const overriddenDefaultColors = { red: overriddenColor };

      const result = getTimerColorConfig(
        "Boss NPC",
        timersColors,
        customColors,
        overriddenDefaultColors,
      );

      expect(result.selectedColor).toBe("red");
      expect(result.customColor).toBeUndefined();
      expect(result.overriddenColor).toEqual(overriddenColor);
    });

    it("should default to white when timer has no color set", () => {
      const timersColors = {};
      const customColors = {};
      const overriddenDefaultColors = {};

      const result = getTimerColorConfig(
        "Unknown NPC",
        timersColors,
        customColors,
        overriddenDefaultColors,
      );

      expect(result.selectedColor).toBe("white");
    });
  });
});
