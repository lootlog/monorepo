import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { useGlobalStore } from "@/store/global.store";
import { useOthersStore } from "@/store/others.store";

const mocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const state: {
    afterGameEventHandler: ((event: GameEvent) => void) | null;
  } = {
    afterGameEventHandler: null,
  };
  const subscribeAfterGameEvent = vi.fn(
    (handler: (event: GameEvent) => void) => {
      state.afterGameEventHandler = handler;
      return unsubscribe;
    },
  );
  const patchOtherCharacterTooltips = vi.fn();

  return {
    patchOtherCharacterTooltips,
    state,
    subscribeAfterGameEvent,
    unsubscribe,
  };
});

vi.mock("@/lib/game-events-manager", () => ({
  gameEventsManager: {
    subscribeAfterGameEvent: mocks.subscribeAfterGameEvent,
  },
}));

vi.mock("@/lib/margonem-tooltips", () => ({
  patchOtherCharacterTooltips: mocks.patchOtherCharacterTooltips,
}));

import { useCharacterTooltipGameEvents } from "./use-character-tooltip-game-events";

const originalWindowEngine = window.Engine;

function createRuntimeOther(nick: string): Other {
  return {
    d: {
      account: 1,
      icon: `${nick}.gif`,
      id: nick,
      lvl: 300,
      nick,
      prof: "w",
    },
    createStrTip: () => `<div>${nick}</div>`,
  } as Other;
}

function setRuntimeOthers(others: Record<string, Other>, check = vi.fn()) {
  check.mockImplementation(() => others);
  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      others: {
        check,
      },
    },
  });

  return check;
}

describe("useCharacterTooltipGameEvents", () => {
  beforeEach(() => {
    mocks.state.afterGameEventHandler = null;
    mocks.unsubscribe.mockReset();
    mocks.subscribeAfterGameEvent.mockClear();
    mocks.patchOtherCharacterTooltips.mockClear();
    useGlobalStore.getState().setGameState({ gameInitialized: false });
    useOthersStore.getState().clearOthers();

    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: originalWindowEngine,
    });
  });

  it("loads and patches current others once after game initialization", () => {
    const first = createRuntimeOther("first");
    const second = createRuntimeOther("second");
    const check = setRuntimeOthers({ 1: first, 2: second });

    const { rerender } = renderHook(() => useCharacterTooltipGameEvents());

    expect(check).not.toHaveBeenCalled();

    act(() => {
      useGlobalStore.getState().setGameState({ gameInitialized: true });
    });
    rerender();
    rerender();

    expect(check).toHaveBeenCalledOnce();
    expect(useOthersStore.getState().othersById).toEqual({
      1: first,
      2: second,
    });
    expect(mocks.patchOtherCharacterTooltips).toHaveBeenCalledWith([
      first,
      second,
    ]);
  });

  it("stores and patches only runtime others touched by an other event", () => {
    const first = createRuntimeOther("first");
    const untouched = createRuntimeOther("untouched");
    setRuntimeOthers({ 1: first, 2: untouched });

    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.({
      other: {
        1: {
          action: "CREATE",
          account: 1,
          nick: "Other",
          icon: "other.gif",
          x: 1,
          y: 1,
          dir: 0,
          stasis: 0,
          stasis_incoming_seconds: 0,
          rights: 0,
          lvl: 300,
          oplvl: 0,
          prof: "w",
          attr: 0,
          is_blessed: 0,
          relation: 0,
        },
      },
    });

    expect(useOthersStore.getState().getOther("1")).toBe(first);
    expect(useOthersStore.getState().getOther("2")).toBeUndefined();
    expect(mocks.patchOtherCharacterTooltips).toHaveBeenCalledWith([first]);
  });

  it("patches only movement/update ids present in the payload", () => {
    const first = createRuntimeOther("first");
    const second = createRuntimeOther("second");
    setRuntimeOthers({ 1: first, 2: second });

    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.({
      other: {
        2: {
          x: 10,
          y: 11,
          dir: 2,
        },
      },
    });

    expect(useOthersStore.getState().getOther("2")).toBe(second);
    expect(useOthersStore.getState().getOther("1")).toBeUndefined();
    expect(mocks.patchOtherCharacterTooltips).toHaveBeenCalledWith([second]);
  });

  it("removes deleted others and does not patch them", () => {
    const first = createRuntimeOther("first");
    setRuntimeOthers({ 1: first });
    useOthersStore.getState().upsertOther("1", first);

    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.({
      other: {
        1: {
          del: 1,
        },
      },
    });

    expect(useOthersStore.getState().getOther("1")).toBeUndefined();
    expect(mocks.patchOtherCharacterTooltips).toHaveBeenCalledWith([]);
  });

  it("ignores events without other payloads", () => {
    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.({ e: "ok" });

    expect(mocks.patchOtherCharacterTooltips).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useCharacterTooltipGameEvents());

    unmount();

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
