import { describe, expect, it } from "vitest";
import { checkFiltersActive } from "./filters-utils";
import { DEFAULT_TIMERS_FILTERS } from "@/store/timers.store";
import { NpcType } from "@/hooks/api/use-npcs";

describe("filters-utils", () => {
  describe("checkFiltersActive", () => {
    it("should return false when no filters are active", () => {
      const result = checkFiltersActive("", 0, DEFAULT_TIMERS_FILTERS);

      expect(result).toBe(false);
    });

    it("should return true when search text is provided", () => {
      const result = checkFiltersActive("dragon", 0, DEFAULT_TIMERS_FILTERS);

      expect(result).toBe(true);
    });

    it("should return true when there are hidden timers", () => {
      const result = checkFiltersActive("", 5, DEFAULT_TIMERS_FILTERS);

      expect(result).toBe(true);
    });

    it("should return true when custom level range is set", () => {
      const customFilters = {
        ...DEFAULT_TIMERS_FILTERS,
        minLvl: 50,
      };

      const result = checkFiltersActive("", 0, customFilters);

      expect(result).toBe(true);
    });

    it("should return true when custom NPC types are selected", () => {
      const customFilters = {
        ...DEFAULT_TIMERS_FILTERS,
        selectedNpcTypes: [NpcType.HERO],
      };

      const result = checkFiltersActive("", 0, customFilters);

      expect(result).toBe(true);
    });

    it("should return true when color filters are selected", () => {
      const customFilters = {
        ...DEFAULT_TIMERS_FILTERS,
        selectedColors: ["red", "blue"],
      };

      const result = checkFiltersActive("", 0, customFilters);

      expect(result).toBe(true);
    });

    it("should return true when multiple filters are active", () => {
      const customFilters = {
        ...DEFAULT_TIMERS_FILTERS,
        minLvl: 50,
        selectedColors: ["red"],
      };

      const result = checkFiltersActive("boss", 3, customFilters);

      expect(result).toBe(true);
    });
  });
});
