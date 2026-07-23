import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useGlobalStore } from "@/store/global.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";

const mocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const state: {
    afterGameEventHandler: ((event: GameEvent) => void) | null;
  } = {
    afterGameEventHandler: null,
  };
  const subscribeApplied = vi.fn(
    (handler: (envelope: { raw: GameEvent }) => void) => {
      state.afterGameEventHandler = (event) => handler({ raw: event });
      return unsubscribe;
    },
  );
  const patchOtherCharacterTooltips = vi.fn();

  return {
    patchOtherCharacterTooltips,
    state,
    subscribeApplied,
    unsubscribe,
  };
});

vi.mock("@/lib/margonem-runtime/margonem-runtime-bridge", () => ({
  margonemRuntimeBridge: {
    subscribeApplied: mocks.subscribeApplied,
  },
}));

vi.mock("@/lib/margonem-tooltips/patcher", () => ({
  patchOtherCharacterTooltips: mocks.patchOtherCharacterTooltips,
}));

import { useCharacterTooltipGameEvents } from "./use-character-tooltip-game-events";

const originalWindowEngine = testRuntimeWindow.Engine;

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
  useOthersStore.getState().setMany(others);
  return check;
}

function setOnlineOwner(other: Other): void {
  useOnlineCharacterOwnersStore.getState().setPresenceResponse({
    "player-discord": [
      {
        discordId: "player-discord",
        isAfk: false,
        player: {
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          icon: other.d.icon,
          lvl: other.d.lvl,
          name: other.d.nick,
          prof: other.d.prof,
          world: "tempest",
        },
      },
    ],
  });
}

function createTownEvent(): GameEvent {
  return {
    town: {
      bg: "dd3.jpg",
      file: "it-eldrik-2.png",
      id: 2659,
      mainid: 1,
      mode: 0,
      name: "Dom Eldrika p.1",
      pvp: 0,
      visibility: 0,
      water: "",
      x: 16,
      y: 16,
    },
  };
}

describe("useCharacterTooltipGameEvents", () => {
  beforeEach(() => {
    mocks.state.afterGameEventHandler = null;
    mocks.unsubscribe.mockReset();
    mocks.subscribeApplied.mockClear();
    mocks.patchOtherCharacterTooltips.mockClear();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useGlobalStore.getState().setGameState({ gameInitialized: false });
    useOnlineCharacterOwnersStore.getState().clearOwners();
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

    expect(check).not.toHaveBeenCalled();
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

    expect(useOthersStore.getState().getOther("1")?.name).toBe("first");
    expect(useOthersStore.getState().getOther("2")?.name).toBe("untouched");
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

    expect(useOthersStore.getState().getOther("2")?.name).toBe("second");
    expect(useOthersStore.getState().getOther("1")?.name).toBe("first");
    expect(mocks.patchOtherCharacterTooltips).toHaveBeenCalledWith([second]);
  });

  it("does not patch deleted others", () => {
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

    expect(useOthersStore.getState().getOther("1")?.name).toBe("first");
    expect(mocks.patchOtherCharacterTooltips).toHaveBeenCalledWith([]);
  });

  it("ignores events without other payloads", () => {
    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.({ e: "ok" });

    expect(mocks.patchOtherCharacterTooltips).not.toHaveBeenCalled();
  });

  it("leaves domain synchronization to RuntimeStateSynchronizer", () => {
    const oldOther = createRuntimeOther("old");
    useOthersStore.getState().setMany({ old: oldOther });

    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.(createTownEvent());

    expect(useOthersStore.getState().getOther("old")?.name).toBe("old");
    expect(mocks.patchOtherCharacterTooltips).not.toHaveBeenCalled();
  });

  it("patches post-town handles supplied by RuntimeStateSynchronizer", () => {
    const oldOther = createRuntimeOther("old");
    const newOther = createRuntimeOther("new");
    useOthersStore.getState().setMany({ old: oldOther });
    setRuntimeOthers({ new: newOther });

    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.({
      ...createTownEvent(),
      other: {
        new: {
          action: "CREATE",
          account: 1,
          nick: "new",
          icon: "new.gif",
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

    expect(useOthersStore.getState().getOther("new")?.name).toBe("new");
    expect(mocks.patchOtherCharacterTooltips).toHaveBeenCalledWith([newOther]);
  });

  it("clears the active tooltip target on town events", () => {
    const other = createRuntimeOther("active");
    setOnlineOwner(other);
    useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).not.toBeNull();

    renderHook(() => useCharacterTooltipGameEvents());

    mocks.state.afterGameEventHandler?.(createTownEvent());

    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeOther,
    ).toBeNull();
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();
  });

  it("does not publish domain state from the projection hook", () => {
    const removed = createRuntimeOther("removed");
    const added = createRuntimeOther("added");
    useOthersStore.getState().setMany({ removed });
    setRuntimeOthers({ added });
    renderHook(() => useCharacterTooltipGameEvents());
    const publish = vi.fn();
    const unsubscribe = useOthersStore.subscribe(publish);

    mocks.state.afterGameEventHandler?.({
      other: {
        added: { dir: 2, x: 10, y: 11 },
        removed: { del: 1 },
      },
    });

    expect(useOthersStore.getState().getOther("added")?.name).toBe("added");
    expect(publish).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useCharacterTooltipGameEvents());

    unmount();

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
  });
});
import { testRuntimeWindow } from "@/test/test-runtime-window";
