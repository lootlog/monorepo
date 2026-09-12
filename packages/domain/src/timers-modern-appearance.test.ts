import { describe, expect, it } from "bun:test";
import {
  TIMERS_MODERN_COMFORTABLE_PRESET,
  TIMERS_MODERN_COMPACT_PRESET,
} from "@lootlog/schema/timer-settings";
import {
  getTimersModernAppearancePreset,
  mergeTimersModernAppearance,
  normalizeTimersModernAppearance,
} from "./timers-modern-appearance.js";

describe("timers modern appearance", () => {
  it("recognizes both presets and marks a changed value as custom", () => {
    expect(
      getTimersModernAppearancePreset(TIMERS_MODERN_COMFORTABLE_PRESET),
    ).toBe("comfortable");
    expect(getTimersModernAppearancePreset(TIMERS_MODERN_COMPACT_PRESET)).toBe(
      "compact",
    );
    expect(
      getTimersModernAppearancePreset({
        ...TIMERS_MODERN_COMPACT_PRESET,
        showFooter: true,
      }),
    ).toBe("custom");
  });

  it("clamps numbers and falls back per field for a partial or invalid document", () => {
    expect(
      normalizeTimersModernAppearance({
        fontScalePercent: 1_000,
        gapPx: -3,
        showHeader: "yes",
      }),
    ).toEqual({
      ...TIMERS_MODERN_COMFORTABLE_PRESET,
      fontScalePercent: 150,
      gapPx: 0,
    });
    expect(normalizeTimersModernAppearance(null)).toEqual(
      TIMERS_MODERN_COMFORTABLE_PRESET,
    );
  });

  it("merges a patch over the stored values instead of the preset default", () => {
    expect(
      mergeTimersModernAppearance(TIMERS_MODERN_COMPACT_PRESET, {
        minColumnWidth: 999,
      }),
    ).toEqual({ ...TIMERS_MODERN_COMPACT_PRESET, minColumnWidth: 320 });
  });
});
