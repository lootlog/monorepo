import { describe, expect, it } from "vitest";
import type { TimerWithTimeLeft } from "./timers-utils";
import { calculateColorStatistics } from "./color-statistics";

describe("color-statistics", () => {
  describe("calculateColorStatistics", () => {
    it("should calculate statistics for timers with default colors", () => {
      const timersColors = {
        Boss1: "red",
        Boss2: "blue",
        Boss3: "red",
      };

      const sortedTimers: TimerWithTimeLeft[] = [
        { npc: { id: 1, name: "Boss1" } } as TimerWithTimeLeft,
        { npc: { id: 2, name: "Boss2" } } as TimerWithTimeLeft,
      ];

      const result = calculateColorStatistics(
        timersColors,
        sortedTimers,
        {},
        {},
        {},
      );

      const redStat = result.find((s) => s.color === "red");
      const blueStat = result.find((s) => s.color === "blue");

      expect(redStat?.total).toBe(2);
      expect(redStat?.active).toBe(1);
      expect(blueStat?.total).toBe(1);
      expect(blueStat?.active).toBe(1);
    });

    it("should include custom colors in statistics", () => {
      const timersColors = {
        Boss1: "custom1",
      };

      const sortedTimers: TimerWithTimeLeft[] = [
        { npc: { id: 1, name: "Boss1" } } as TimerWithTimeLeft,
      ];

      const customColors = {
        custom1: {
          id: "custom1",
          name: "My Custom Red",
          backgroundColor: "#ff0000",
          borderColor: "#cc0000",
        },
      };

      const result = calculateColorStatistics(
        timersColors,
        sortedTimers,
        customColors,
        {},
        {},
      );

      const customStat = result.find((s) => s.color === "custom1");

      expect(customStat?.total).toBe(1);
      expect(customStat?.active).toBe(1);
      expect(customStat?.name).toBe("My Custom Red");
      expect(customStat?.bgColor).toBe("#ff0000");
      expect(customStat?.borderColor).toBe("#cc0000");
    });

    it("should use default color names when provided", () => {
      const timersColors = {
        Boss1: "red",
      };

      const sortedTimers: TimerWithTimeLeft[] = [
        { npc: { id: 1, name: "Boss1" } } as TimerWithTimeLeft,
      ];

      const defaultColorNames = {
        red: "My Red Name",
      };

      const result = calculateColorStatistics(
        timersColors,
        sortedTimers,
        {},
        defaultColorNames,
        {},
      );

      const redStat = result.find((s) => s.color === "red");

      expect(redStat?.name).toBe("My Red Name");
    });

    it("should include overridden colors in statistics", () => {
      const timersColors = {
        Boss1: "red",
      };

      const sortedTimers: TimerWithTimeLeft[] = [
        { npc: { id: 1, name: "Boss1" } } as TimerWithTimeLeft,
      ];

      const overriddenDefaultColors = {
        red: {
          backgroundColor: "#ff00ff",
          borderColor: "#cc00cc",
        },
      };

      const result = calculateColorStatistics(
        timersColors,
        sortedTimers,
        {},
        {},
        overriddenDefaultColors,
      );

      const redStat = result.find((s) => s.color === "red");

      expect(redStat?.bgColor).toBe("#ff00ff");
      expect(redStat?.borderColor).toBe("#cc00cc");
    });

    it("should filter out colors with no timers", () => {
      const timersColors = {
        Boss1: "red",
      };

      const sortedTimers: TimerWithTimeLeft[] = [
        { npc: { id: 1, name: "Boss1" } } as TimerWithTimeLeft,
      ];

      const result = calculateColorStatistics(
        timersColors,
        sortedTimers,
        {},
        {},
        {},
      );

      expect(result.every((s) => s.total > 0)).toBe(true);
    });

    it("should count active timers correctly", () => {
      const timersColors = {
        Boss1: "red",
        Boss2: "red",
        Boss3: "blue",
      };

      const sortedTimers: TimerWithTimeLeft[] = [
        { npc: { id: 1, name: "Boss1" } } as TimerWithTimeLeft,
      ];

      const result = calculateColorStatistics(
        timersColors,
        sortedTimers,
        {},
        {},
        {},
      );

      const redStat = result.find((s) => s.color === "red");
      const blueStat = result.find((s) => s.color === "blue");

      expect(redStat?.total).toBe(2);
      expect(redStat?.active).toBe(1);
      expect(blueStat?.total).toBe(1);
      expect(blueStat?.active).toBe(0);
    });
  });
});
