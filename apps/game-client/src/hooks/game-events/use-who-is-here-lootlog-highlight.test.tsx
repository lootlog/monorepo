import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  LOOTLOG_OTHER_GLOW_UNKNOWN,
} from "@/lib/lootlog-other-glow-manager";
import { appendCatchingGuildsTooltipSection } from "@/lib/margonem-tooltips/catching-guilds";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import {
  getOtherCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useGameStore } from "@/store/game.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";

const mocks = vi.hoisted(() => ({
  getPlayersCatchingGuilds: vi.fn(),
}));

vi.mock(
  "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config",
  () => ({
    userLootlogConfigControllerGetPlayersCatchingGuilds:
      mocks.getPlayersCatchingGuilds,
  }),
);

import { useCharacterTooltipCatchingGuilds } from "./use-character-tooltip-catching-guilds";
import { useWhoIsHereLootlogHighlight } from "./use-who-is-here-lootlog-highlight";

const originalWindowEngine = window.Engine;
const originalWindowDollar = (window as Window & { $?: unknown }).$;

type WhoIsHereEntry = {
  $: {
    find: ReturnType<typeof vi.fn>;
  };
};

function createOther(id = "617"): Other {
  const other = {
    d: {
      account: 9822301,
      icon: "other.gif",
      id,
      lvl: 300,
      nick: `Other ${id}`,
      prof: "w",
      x: 10,
      y: 10,
    },
    createStrTip: () => `<div>Other ${id}</div>`,
    tipUpdate: vi.fn(),
  };

  return other as unknown as Other;
}

function appendWhoIsHereRow(characterId = "617"): HTMLElement {
  const row = document.createElement("div");
  row.className = "one-other tw-list-item";
  row.dataset.id = characterId;
  row.innerHTML = `
    <div class="tip-container"></div>
    <div class="center">
      <div class="name"><div class="inner">Other ${characterId}</div></div>
      <div class="lvl"></div>
    </div>
  `;
  document.body.innerHTML = '<div class="whoishere-window"></div>';
  document.querySelector(".whoishere-window")?.append(row);

  return row;
}

function setOnlineOwner(characterId = "617", withGuildMember = true): void {
  useOnlineCharacterOwnersStore.getState().setPresenceResponse(
    {
      "player-discord": [
        {
          discordId: "player-discord",
          isAfk: false,
          player: {
            accountId: "9822301",
            characterId,
            icon: "other.gif",
            lvl: 300,
            name: `Other ${characterId}`,
            prof: "w",
            world: "tempest",
          },
        },
      ],
    },
    withGuildMember
      ? {
          "player-discord": {
            avatar: null,
            color: null,
            id: 1,
            name: "Guild Member",
            userId: "player-discord",
          },
        }
      : undefined,
  );
}

function setSuccess(
  characterId = "617",
  guilds = [{ id: "guild-blue", name: "Blue Guild" }],
): void {
  const target = getOtherCatchingGuildsTarget(createOther(characterId));
  if (!target) throw new Error("Expected an online player target");
  useCharacterTooltipCatchingGuildsStore
    .getState()
    .setSuccess(target, guilds, Date.now());
}

function setRuntime(other: Other, createTipWrapper = vi.fn()): void {
  const tipContainer = document.querySelector(".tip-container");
  const whoIsHereEntry: WhoIsHereEntry = {
    $: {
      find: vi.fn(() => tipContainer),
    },
  };

  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      hero: {
        d: {
          id: "hero-1",
        },
      },
      others: {
        check: vi.fn(() => ({
          [String(other.d.id)]: other,
        })),
      },
      whoIsHere: {
        createTipWrapper,
        getWhoIsHereOther: vi.fn(() => whoIsHereEntry),
      },
    },
  });
}

function setSelectedGuild(): void {
  useGameStore.getState().replaceGame({
    hero: {
      accountId: "1",
      characterId: "hero-1",
      currentHp: 1,
      icon: "hero.gif",
      level: 300,
      maxHp: 1,
      name: "Hero",
      profession: "w",
    },
    map: { id: 1, name: "Map", visibility: 30 },
    world: "tempest",
  });
  useSettingsStore.setState({
    guildIdByCharId: {
      "hero-1": "guild-blue",
    },
  });
}

function installMutationObserverMock() {
  const disconnect = vi.fn();
  const observe = vi.fn();
  let callback: MutationCallback | undefined;

  class MutationObserverMock {
    disconnect = disconnect;
    observe = observe;

    constructor(nextCallback: MutationCallback) {
      callback = nextCallback;
    }

    takeRecords(): MutationRecord[] {
      return [];
    }
  }

  vi.stubGlobal("MutationObserver", MutationObserverMock);

  return {
    disconnect,
    emit: () => {
      if (!callback) {
        throw new Error("MutationObserver has not been created");
      }

      callback([], {
        disconnect,
        observe,
        takeRecords: () => [],
      } as unknown as MutationObserver);
    },
    observe,
  };
}

describe("useWhoIsHereLootlogHighlight", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    characterTooltipTransforms.clear();
    mocks.getPlayersCatchingGuilds.mockReset();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useGameStore.getState().clearGame();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useOthersStore.getState().clearOthers();
    useSettingsStore.setState({
      guildIdByCharId: {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: originalWindowEngine,
    });
    Object.defineProperty(window, "$", {
      configurable: true,
      value: originalWindowDollar,
    });
  });

  it("does not observe DOM mutations without shift and a selected guild", () => {
    const { observe } = installMutationObserverMock();

    const { unmount } = renderHook(() => useWhoIsHereLootlogHighlight());

    expect(observe).not.toHaveBeenCalled();

    unmount();
  });

  it("observes the whoIsHere window instead of the document body when active", () => {
    appendWhoIsHereRow();
    setRuntime(createOther());
    setSelectedGuild();
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    const { observe } = installMutationObserverMock();

    const { unmount } = renderHook(() => useWhoIsHereLootlogHighlight());

    expect(observe).toHaveBeenCalledWith(
      document.querySelector(".whoishere-window"),
      {
        childList: true,
        subtree: true,
      },
    );
    expect(observe).not.toHaveBeenCalledWith(document.body, expect.anything());

    unmount();
  });

  it("disconnects the DOM observer when shift is released", () => {
    appendWhoIsHereRow();
    setRuntime(createOther());
    setSelectedGuild();
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    const { disconnect, observe } = installMutationObserverMock();

    const { unmount } = renderHook(() => useWhoIsHereLootlogHighlight());

    expect(observe).toHaveBeenCalledOnce();

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    });

    expect(disconnect).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledOnce();

    unmount();
  });

  it("discovers a newly opened whoIsHere window without observing document body", () => {
    vi.useFakeTimers();
    const other = createOther();
    setRuntime(other);
    setSelectedGuild();
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    const { observe } = installMutationObserverMock();

    const { unmount } = renderHook(() => useWhoIsHereLootlogHighlight());

    expect(observe).not.toHaveBeenCalled();

    const whoIsHereWindow = document.createElement("div");
    whoIsHereWindow.className = "whoishere-window";
    document.body.append(whoIsHereWindow);
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(observe).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledWith(whoIsHereWindow, {
      childList: true,
      subtree: true,
    });
    expect(observe).not.toHaveBeenCalledWith(document.body, expect.anything());

    unmount();
    vi.useRealTimers();
  });

  it("refreshes mutated rows without rerendering the hook", () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();
    setOnlineOwner();
    setSuccess();
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    const { emit } = installMutationObserverMock();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    let renderCount = 0;

    const { unmount } = renderHook(() => {
      renderCount += 1;
      useWhoIsHereLootlogHighlight();
    });
    const renderCountBeforeMutation = renderCount;
    row.classList.remove("ll-who-is-here-lootlog-highlight");
    row.style.removeProperty("--ll-who-is-here-lootlog-color");

    act(() => {
      emit();
    });

    expect(row).toHaveClass("ll-who-is-here-lootlog-highlight");
    expect(renderCount).toBe(renderCountBeforeMutation);

    unmount();
  });

  it("highlights a whoIsHere row blue when selected guild catches the player", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();
    setOnlineOwner();
    setSuccess();

    renderHook(() => useWhoIsHereLootlogHighlight());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(row).toHaveClass("ll-who-is-here-lootlog-highlight");
    });
    expect(row.style.getPropertyValue("--ll-who-is-here-lootlog-color")).toBe(
      LOOTLOG_OTHER_GLOW_BLUE,
    );
    const style = document.getElementById("ll-who-is-here-lootlog-style");
    expect(style?.textContent).toContain(
      "color: var(--ll-who-is-here-lootlog-color) !important",
    );
    expect(style?.textContent).not.toContain("box-shadow");
    expect(style?.textContent).not.toContain("border:");
    expect(style?.textContent).not.toContain("border-left");
  });

  it("highlights a whoIsHere row red-orange when selected guild does not catch the player", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();
    setOnlineOwner();
    setSuccess("617", []);

    renderHook(() => useWhoIsHereLootlogHighlight());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(row.style.getPropertyValue("--ll-who-is-here-lootlog-color")).toBe(
        LOOTLOG_OTHER_GLOW_RED_ORANGE,
      );
    });
  });

  it("clears highlight when shift is released", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();
    setOnlineOwner();
    setSuccess();

    renderHook(() => useWhoIsHereLootlogHighlight());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(row).toHaveClass("ll-who-is-here-lootlog-highlight");
    });

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    });

    await waitFor(() => {
      expect(row).not.toHaveClass("ll-who-is-here-lootlog-highlight");
    });
  });

  it("highlights loading, error, and unknown-owner rows fuchsia", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();

    renderHook(() => useWhoIsHereLootlogHighlight());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(row).toHaveClass("ll-who-is-here-lootlog-highlight");
      expect(row.style.getPropertyValue("--ll-who-is-here-lootlog-color")).toBe(
        LOOTLOG_OTHER_GLOW_UNKNOWN,
      );
    });

    act(() => {
      setOnlineOwner();
      const target = getOtherCatchingGuildsTarget(other);
      if (!target) throw new Error("Expected an online player target");
      useCharacterTooltipCatchingGuildsStore.getState().setLoading(target);
    });

    await waitFor(() => {
      expect(row.style.getPropertyValue("--ll-who-is-here-lootlog-color")).toBe(
        LOOTLOG_OTHER_GLOW_UNKNOWN,
      );
    });

    act(() => {
      const target = getOtherCatchingGuildsTarget(other);
      if (!target) throw new Error("Expected an online player target");
      useCharacterTooltipCatchingGuildsStore.getState().setError(target);
    });

    await waitFor(() => {
      expect(row.style.getPropertyValue("--ll-who-is-here-lootlog-color")).toBe(
        LOOTLOG_OTHER_GLOW_UNKNOWN,
      );
    });
  });

  it("sets active other and refreshes whoIsHere tooltip on hover with shift", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    let tooltipHtml = "";
    const createTipWrapper = vi.fn(
      (_tipContainer: unknown, tooltipOther: Other) => {
        tooltipHtml = String(tooltipOther.createStrTip?.() ?? "");
      },
    );
    characterTooltipTransforms.register(appendCatchingGuildsTooltipSection);
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other, createTipWrapper);
    setSelectedGuild();
    setOnlineOwner("617", false);
    setSuccess();

    renderHook(() => useWhoIsHereLootlogHighlight());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
      row.dispatchEvent(
        new MouseEvent("mouseover", {
          bubbles: true,
        }),
      );
    });

    await waitFor(() => {
      expect(createTipWrapper).toHaveBeenCalled();
    });
    expect(useCharacterTooltipCatchingGuildsStore.getState().activeOther).toBe(
      other,
    );
    expect(tooltipHtml).toContain("Gra jako:");
    expect(tooltipHtml).toContain("player-discord");
    expect(tooltipHtml).toContain("Blue Guild");

    act(() => {
      row.dispatchEvent(
        new MouseEvent("mouseout", {
          bubbles: true,
        }),
      );
    });

    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeOther,
    ).toBeNull();
  });

  it("refreshes the hovered whoIsHere tooltip when shift toggles off", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    let tooltipHtml = "";
    const createTipWrapper = vi.fn(
      (_tipContainer: unknown, tooltipOther: Other) => {
        tooltipHtml = String(tooltipOther.createStrTip?.() ?? "");
      },
    );
    characterTooltipTransforms.register(appendCatchingGuildsTooltipSection);
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other, createTipWrapper);
    setSelectedGuild();
    setOnlineOwner();
    setSuccess();

    renderHook(() => useWhoIsHereLootlogHighlight());

    act(() => {
      row.dispatchEvent(
        new MouseEvent("mouseover", {
          bubbles: true,
        }),
      );
    });

    await waitFor(() => {
      expect(createTipWrapper).toHaveBeenCalled();
    });
    expect(tooltipHtml).toBe("<div>Other 617</div>");

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(tooltipHtml).toContain("Gra jako:");
    });
    expect(tooltipHtml).toContain("Guild Member");
    expect(tooltipHtml).toContain("Blue Guild");

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    });

    await waitFor(() => {
      expect(tooltipHtml).toBe("<div>Other 617</div>");
    });
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeOther,
    ).toBeNull();
  });

  it("fetches tooltip data when online owner becomes known after whoIsHere hover", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();
    mocks.getPlayersCatchingGuilds.mockResolvedValue({
      players: [
        {
          userId: "player-discord",
          accountId: "9822301",
          characterId: "617",
          guilds: [{ id: "guild-blue", name: "Blue Guild" }],
        },
      ],
    });

    renderHook(() => {
      useCharacterTooltipCatchingGuilds();
      useWhoIsHereLootlogHighlight();
    });

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
      row.dispatchEvent(
        new MouseEvent("mouseover", {
          bubbles: true,
        }),
      );
    });

    expect(mocks.getPlayersCatchingGuilds).not.toHaveBeenCalled();

    act(() => {
      setOnlineOwner();
    });

    await waitFor(() => {
      expect(mocks.getPlayersCatchingGuilds).toHaveBeenCalledWith(
        {
          players: [
            {
              userId: "player-discord",
              accountId: "9822301",
              characterId: "617",
            },
          ],
        },
        { signal: expect.any(AbortSignal) },
      );
    });
  });

  it("removes highlight styles and injected CSS on cleanup", async () => {
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();
    setOnlineOwner();
    setSuccess();

    const { unmount } = renderHook(() => useWhoIsHereLootlogHighlight());

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    });

    await waitFor(() => {
      expect(row).toHaveClass("ll-who-is-here-lootlog-highlight");
    });

    unmount();

    expect(row).not.toHaveClass("ll-who-is-here-lootlog-highlight");
    expect(document.getElementById("ll-who-is-here-lootlog-style")).toBeNull();
  });
});
