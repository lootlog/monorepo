import { describe, expect, it } from "vitest";
import { decodeTimerSettings } from "./timer-settings-codec";

// Stored timer settings come from localStorage written by every earlier
// release and from server documents; the decoder must keep reading them.
const color = { borderColor: "#111", backgroundColor: "#222" };

const storedSettings = {
  updatedAt: 1_700_000_000_000,
  generalConfig: {
    removeTimerAfterMs: 30_000,
    timersGrouping: true,
    timersUnderBag: false,
    countdownMode: "min",
    compactView: true,
    retiredOption: "kept",
  },
  displayConfig: {
    legacyAppearance: true,
    showType: false,
    showLevel: true,
    fontSize: 12,
    minColumnWidth: 150,
    singleTimerDisplayMode: "column",
    retiredOption: 3,
  },
  hiddenTimers: { global: ["Tanroth"], guild: [] },
  pinnedTimers: { global: [] },
  alwaysVisibleExpiredTimers: { guild: ["Kic"] },
  timersColors: { Tanroth: "custom-1" },
  customColors: {
    "custom-1": { id: "custom-1", name: "Red", ...color, extra: true },
  },
  defaultColorNames: { red: "Czerwony" },
  overriddenDefaultColors: { red: { ...color, extra: true } },
  hiddenDefaultColors: ["blue"],
  timersFilters: {
    guild: {
      minLvl: 1,
      maxLvl: 300,
      selectedNpcTypes: ["HERO", "TITAN"],
      selectedColors: ["red"],
      extra: true,
    },
  },
  timerFiltersEnabled: true,
  colorFiltersEnabled: false,
  timersSortOrder: "desc",
  syncEnabled: true,
};

describe("decodeTimerSettings", () => {
  it("keeps every stored field, extension keys in configs, and drops unknown keys elsewhere", () => {
    expect(
      decodeTimerSettings(JSON.parse(JSON.stringify(storedSettings))),
    ).toStrictEqual({
      updatedAt: 1_700_000_000_000,
      generalConfig: storedSettings.generalConfig,
      displayConfig: storedSettings.displayConfig,
      hiddenTimers: storedSettings.hiddenTimers,
      pinnedTimers: storedSettings.pinnedTimers,
      alwaysVisibleExpiredTimers: storedSettings.alwaysVisibleExpiredTimers,
      timersColors: storedSettings.timersColors,
      customColors: { "custom-1": { id: "custom-1", name: "Red", ...color } },
      defaultColorNames: storedSettings.defaultColorNames,
      overriddenDefaultColors: { red: color },
      hiddenDefaultColors: ["blue"],
      timersFilters: {
        guild: {
          minLvl: 1,
          maxLvl: 300,
          selectedNpcTypes: ["HERO", "TITAN"],
          selectedColors: ["red"],
        },
      },
      timerFiltersEnabled: true,
      colorFiltersEnabled: false,
      timersSortOrder: "desc",
    });
  });

  it("reads anything but an object as empty settings", () => {
    for (const stored of [null, undefined, "settings", 7, [], [storedSettings]])
      expect(decodeTimerSettings(stored)).toStrictEqual({});
  });

  it("reads missing fields as absent and a missing legacy appearance as modern", () => {
    expect(decodeTimerSettings({})).toStrictEqual({});
    expect(
      decodeTimerSettings({ generalConfig: {}, displayConfig: {} }),
    ).toStrictEqual({
      generalConfig: {},
      displayConfig: { legacyAppearance: false },
    });
  });

  it("accepts explicitly undefined fields from unset server documents", () => {
    expect(
      decodeTimerSettings({
        generalConfig: undefined,
        displayConfig: { legacyAppearance: undefined, fontSize: undefined },
        timersColors: { Tanroth: undefined },
        timersSortOrder: undefined,
      }),
    ).toStrictEqual({
      generalConfig: undefined,
      displayConfig: { legacyAppearance: false, fontSize: undefined },
      timersColors: { Tanroth: undefined },
      timersSortOrder: undefined,
    });
  });

  it("drops only the invalid top-level field and keeps the rest", () => {
    expect(
      decodeTimerSettings({
        ...storedSettings,
        updatedAt: "2026-01-01",
        generalConfig: { ...storedSettings.generalConfig, countdownMode: "x" },
        hiddenTimers: { global: "Tanroth" },
        timersColors: { Tanroth: null },
        customColors: { "custom-1": { ...color, name: "Red" } },
        hiddenDefaultColors: "blue",
        timersFilters: {
          guild: {
            ...storedSettings.timersFilters.guild,
            selectedNpcTypes: ["BOSS"],
          },
        },
        timerFiltersEnabled: "yes",
        timersSortOrder: "newest",
      }),
    ).toStrictEqual({
      updatedAt: undefined,
      generalConfig: undefined,
      displayConfig: storedSettings.displayConfig,
      hiddenTimers: undefined,
      pinnedTimers: storedSettings.pinnedTimers,
      alwaysVisibleExpiredTimers: storedSettings.alwaysVisibleExpiredTimers,
      timersColors: undefined,
      customColors: undefined,
      defaultColorNames: storedSettings.defaultColorNames,
      overriddenDefaultColors: { red: color },
      hiddenDefaultColors: undefined,
      timersFilters: undefined,
      timerFiltersEnabled: undefined,
      colorFiltersEnabled: false,
      timersSortOrder: undefined,
    });
  });

  it("drops a display config with an invalid option but repairs only an invalid legacy flag", () => {
    expect(
      decodeTimerSettings({
        displayConfig: { legacyAppearance: "yes", fontSize: 12 },
      }),
    ).toStrictEqual({
      displayConfig: { legacyAppearance: false, fontSize: 12 },
    });
    expect(
      decodeTimerSettings({
        displayConfig: { legacyAppearance: true, fontSize: "12" },
      }),
    ).toStrictEqual({ displayConfig: undefined });
  });
});
