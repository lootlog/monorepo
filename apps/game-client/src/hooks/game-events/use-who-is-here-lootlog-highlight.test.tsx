import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Other } from "@lootlog/margonem/others";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
} from "@/lib/lootlog-other-glow-manager";
import { appendCatchingGuildsTooltipSection } from "@/lib/margonem-tooltips/catching-guilds";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";

const mocks = vi.hoisted(() => ({
  getPlayerCatchingGuilds: vi.fn(),
}));

vi.mock(
  "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config",
  () => ({
    userLootlogConfigControllerGetPlayerCatchingGuilds:
      mocks.getPlayerCatchingGuilds,
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

function createWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

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
  useCharacterTooltipCatchingGuildsStore
    .getState()
    .setSuccess(`player-discord:9822301:${characterId}`, guilds);
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
  useSettingsStore.setState({
    guildIdByCharId: {
      "hero-1": "guild-blue",
    },
  });
}

describe("useWhoIsHereLootlogHighlight", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    characterTooltipTransforms.clear();
    mocks.getPlayerCatchingGuilds.mockReset();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useOthersStore.getState().clearOthers();
    useSettingsStore.setState({
      guildIdByCharId: {},
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: originalWindowEngine,
    });
    Object.defineProperty(window, "$", {
      configurable: true,
      value: originalWindowDollar,
    });
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
      "0 0 0 1px var(--ll-who-is-here-lootlog-color) inset",
    );
    expect(style?.textContent).toContain(
      "0 0 0 1px var(--ll-who-is-here-lootlog-color)",
    );
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

  it("does not highlight loading, error, or unknown-owner rows", async () => {
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
      expect(row).not.toHaveClass("ll-who-is-here-lootlog-highlight");
    });

    act(() => {
      setOnlineOwner();
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setLoading("player-discord:9822301:617");
    });

    await waitFor(() => {
      expect(row).not.toHaveClass("ll-who-is-here-lootlog-highlight");
    });

    act(() => {
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setError("player-discord:9822301:617");
    });

    await waitFor(() => {
      expect(row).not.toHaveClass("ll-who-is-here-lootlog-highlight");
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
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const row = appendWhoIsHereRow();
    const other = createOther();
    useOthersStore.getState().setMany({ "617": other });
    setRuntime(other);
    setSelectedGuild();
    mocks.getPlayerCatchingGuilds.mockResolvedValue({
      userId: "player-discord",
      accountId: "9822301",
      characterId: "617",
      guilds: [{ id: "guild-blue", name: "Blue Guild" }],
    });

    renderHook(
      () => {
        useCharacterTooltipCatchingGuilds();
        useWhoIsHereLootlogHighlight();
      },
      {
        wrapper: createWrapper(queryClient),
      },
    );

    act(() => {
      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
      row.dispatchEvent(
        new MouseEvent("mouseover", {
          bubbles: true,
        }),
      );
    });

    expect(mocks.getPlayerCatchingGuilds).not.toHaveBeenCalled();

    act(() => {
      setOnlineOwner();
    });

    await waitFor(() => {
      expect(mocks.getPlayerCatchingGuilds).toHaveBeenCalledWith({
        userId: "player-discord",
        accountId: "9822301",
        characterId: "617",
      });
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
