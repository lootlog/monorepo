import {
  DEFAULT_LOOTLOG_GLOW_COLOR,
  DEFAULT_NON_LOOTLOG_GLOW_COLOR,
} from "@/addons/extensions/online-players-glow/online-players-glow.constants";
import { useOnlinePlayersGlowStore } from "@/addons/extensions/online-players-glow/online-players-glow.store";
import { beforeEach, describe, expect, it } from "vitest";
import { createJSONStorage } from "zustand/middleware";

const STORAGE_KEY = "ll:addons:online-players-glow:settings";

describe("useOnlinePlayersGlowStore", () => {
  let memoryStorageState: Record<string, string>;

  beforeEach(async () => {
    memoryStorageState = {};

    const memoryStorage = {
      getItem: (name: string) => memoryStorageState[name] ?? null,
      setItem: (name: string, value: string) => {
        memoryStorageState[name] = value;
      },
      removeItem: (name: string) => {
        delete memoryStorageState[name];
      },
    };

    useOnlinePlayersGlowStore.persist.setOptions({
      storage: createJSONStorage(() => memoryStorage),
    });

    useOnlinePlayersGlowStore.setState({
      lootlogGlowEnabled: true,
      lootlogGlowColor: DEFAULT_LOOTLOG_GLOW_COLOR,
      nonLootlogGlowEnabled: false,
      nonLootlogGlowColor: DEFAULT_NON_LOOTLOG_GLOW_COLOR,
    });

    await useOnlinePlayersGlowStore.persist.clearStorage();
    await useOnlinePlayersGlowStore.persist.rehydrate();
  });

  it("has default values", () => {
    const state = useOnlinePlayersGlowStore.getState();

    expect(state.lootlogGlowEnabled).toBe(true);
    expect(state.lootlogGlowColor).toBe(DEFAULT_LOOTLOG_GLOW_COLOR);
    expect(state.nonLootlogGlowEnabled).toBe(false);
    expect(state.nonLootlogGlowColor).toBe(DEFAULT_NON_LOOTLOG_GLOW_COLOR);
  });

  it("updates glow toggles and colors", () => {
    const state = useOnlinePlayersGlowStore.getState();

    state.setLootlogGlowEnabled(false);
    state.setLootlogGlowColor("#123ABC");
    state.setNonLootlogGlowEnabled(true);
    state.setNonLootlogGlowColor("#ABC123");

    const nextState = useOnlinePlayersGlowStore.getState();
    expect(nextState.lootlogGlowEnabled).toBe(false);
    expect(nextState.lootlogGlowColor).toBe("#123abc");
    expect(nextState.nonLootlogGlowEnabled).toBe(true);
    expect(nextState.nonLootlogGlowColor).toBe("#abc123");
  });

  it("rehydrates persisted values with fallback for invalid colors", async () => {
    memoryStorageState[STORAGE_KEY] = JSON.stringify({
      state: {
        lootlogGlowEnabled: false,
        lootlogGlowColor: "not-a-color",
        nonLootlogGlowEnabled: true,
        nonLootlogGlowColor: "#ab12cd",
      },
      version: 1,
    });

    await useOnlinePlayersGlowStore.persist.rehydrate();

    const state = useOnlinePlayersGlowStore.getState();
    expect(state.lootlogGlowEnabled).toBe(false);
    expect(state.lootlogGlowColor).toBe(DEFAULT_LOOTLOG_GLOW_COLOR);
    expect(state.nonLootlogGlowEnabled).toBe(true);
    expect(state.nonLootlogGlowColor).toBe("#ab12cd");
  });
});
