import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNativeRuntime } from "@/test/native-runtime";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
vi.stubGlobal("Engine", createNativeRuntime());
const { useInit } = await import("./use-init");

beforeEach(() => {
  useGlobalStore.getState().setGameState({ gameInitialized: false });
  useGameStore.getState().clearGame();
});
afterEach(() => vi.unstubAllGlobals());

describe("useInit", () => {
  it("restores the original native packet callback on unmount", () => {
    const engine = createNativeRuntime();
    const original = engine.communication.parseJSON;
    vi.stubGlobal("Engine", engine);
    const { unmount } = renderHook(() => useInit());
    expect(engine.communication.parseJSON).not.toBe(original);
    expect(useGameStore.getState().game?.hero.name).toBe("Tester");
    unmount();
    expect(engine.communication.parseJSON).toBe(original);
    expect(useGameStore.getState().game).toBeNull();
  });

  it("waits for native readiness before publishing the initial snapshot", () => {
    const engine = createNativeRuntime();
    engine.interface.alreadyInitialised = false;
    vi.stubGlobal("Engine", engine);
    renderHook(() => useInit());
    expect(useGlobalStore.getState().gameState.gameInitialized).toBe(false);
    expect(useGameStore.getState().game).toBeNull();
    act(() => {
      engine.interface.alreadyInitialised = true;
      engine.communication.parseJSON({});
    });
    expect(useGlobalStore.getState().gameState.gameInitialized).toBe(true);
    expect(useGameStore.getState().game?.hero.name).toBe("Tester");
  });

  it("does not reread the initial snapshot on later packets", () => {
    const engine = createNativeRuntime();
    vi.stubGlobal("Engine", engine);
    renderHook(() => useInit());
    engine.hero.d.nick = "Native value without a packet update";
    act(() => {
      engine.communication.parseJSON({});
    });
    expect(useGameStore.getState().game?.hero.name).toBe("Tester");
  });

  it("reinitializes after the StrictMode cleanup cycle", async () => {
    const engine = createNativeRuntime();
    vi.stubGlobal("Engine", engine);
    renderHook(() => useInit(), { wrapper: StrictMode });
    expect(useGameStore.getState().game?.hero.name).toBe("Tester");
    act(() => {
      engine.communication.parseJSON({ h: { nick: "Updated" } });
    });
    await waitFor(() =>
      expect(useGameStore.getState().game?.hero.name).toBe("Updated"),
    );
  });

  it("retries when a ready client initially cannot supply its snapshot", () => {
    const engine = createNativeRuntime();
    vi.spyOn(engine.worldConfig, "getWorldName").mockImplementationOnce(() => {
      throw new Error("Native world is not initialized yet");
    });
    vi.stubGlobal("Engine", engine);
    renderHook(() => useInit());
    expect(useGlobalStore.getState().gameState.gameInitialized).toBe(false);
    expect(useGameStore.getState().game).toBeNull();
    act(() => {
      engine.communication.parseJSON({});
    });
    expect(useGlobalStore.getState().gameState.gameInitialized).toBe(true);
    expect(useGameStore.getState().game?.world).toBe("pandora");
  });
});
