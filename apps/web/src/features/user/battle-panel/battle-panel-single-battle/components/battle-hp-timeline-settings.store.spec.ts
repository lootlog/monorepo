import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG } from "./battle-hp-timeline-layers";

const SETTINGS_STORAGE_KEY = "lootlog-battle-hp-timeline-settings-v1";
const LEGACY_LAYERS_STORAGE_KEY = "lootlog-battle-timeline-layers-v2";

const createMemoryStorage = (initialValues: Record<string, string> = {}) => {
  let values = { ...initialValues };

  return {
    get length() {
      return Object.keys(values).length;
    },
    clear: () => {
      values = {};
    },
    getItem: (key: string) => values[key] ?? null,
    key: (index: number) => Object.keys(values)[index] ?? null,
    removeItem: (key: string) => {
      delete values[key];
    },
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  } satisfies Storage;
};

describe("useBattleHpTimelineSettingsStore", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("uses legacy layer settings when the new store has no persisted state", async () => {
    const storage = createMemoryStorage({
      [LEGACY_LAYERS_STORAGE_KEY]: JSON.stringify({
        legendary: false,
        stun: true,
        unknownLayer: true,
      }),
    });
    vi.stubGlobal("localStorage", storage);

    const { useBattleHpTimelineSettingsStore } =
      await import("./battle-hp-timeline-settings.store");
    const state = useBattleHpTimelineSettingsStore.getState();

    expect(state.heightMode).toBe("default");
    expect(state.isChartHidden).toBe(false);
    expect(state.layers.legendary).toBe(false);
    expect(state.layers.stun).toBe(true);
    expect(Object.keys(state.layers)).toEqual(
      Object.keys(DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG),
    );
  });

  it("normalizes persisted state and saves chart settings", async () => {
    const storage = createMemoryStorage({
      [SETTINGS_STORAGE_KEY]: JSON.stringify({
        state: {
          heightMode: "expanded",
          isChartHidden: true,
          layers: {
            freeze: true,
            unknownLayer: true,
          },
        },
        version: 1,
      }),
    });
    vi.stubGlobal("localStorage", storage);

    const { useBattleHpTimelineSettingsStore } =
      await import("./battle-hp-timeline-settings.store");
    const state = useBattleHpTimelineSettingsStore.getState();

    expect(state.heightMode).toBe("expanded");
    expect(state.isChartHidden).toBe(true);
    expect(state.layers.freeze).toBe(true);
    expect(Object.keys(state.layers)).toEqual(
      Object.keys(DEFAULT_BATTLE_HP_TIMELINE_LAYER_CONFIG),
    );

    state.setChartHidden(false);
    state.setHeightMode("default");
    state.setLayerVisibility("combo", true);

    const persisted = JSON.parse(
      storage.getItem(SETTINGS_STORAGE_KEY) ?? "{}",
    ) as {
      state?: {
        heightMode?: string;
        isChartHidden?: boolean;
        layers?: Record<string, boolean>;
      };
    };

    expect(persisted.state?.heightMode).toBe("default");
    expect(persisted.state?.isChartHidden).toBe(false);
    expect(persisted.state?.layers?.combo).toBe(true);
  });
});
