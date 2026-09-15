import {
  act,
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ServerVisibilitySettingsTab } from "./server-visibility-settings-tab";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";

import {
  createGuildPreferencesTest,
  createTestGuild,
} from "@/test/guild-preferences-test";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<ServerVisibilitySettingsTab />, { wrapper: harness.wrapper });

describe("ServerVisibilitySettingsTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.queryClient.setQueryData(harness.guildsKey, [
      createTestGuild("guild-1", "Alpha"),
      {
        ...createTestGuild("guild-2", "Beta"),
        icon: "https://cdn.discordapp.com/icons/guild-2/beta.png",
      },
      createTestGuild("guild-3", "Gamma"),
    ]);
    harness.setPreferences({
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: ["guild-2", "temporarily-unavailable"],
    });
    useGameStore.getState().clearGame();
    useSettingsStore.setState({
      guildIdByCharId: {},
      presenceOrganizationIdsByCharId: {},
    });
  });

  it("shows ordered guilds with visibility state", () => {
    render();

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Beta", pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Alpha", pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gamma", pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 z 3")).toBeInTheDocument();
  });

  it("filters hidden guilds and searches by name", () => {
    render();

    fireEvent.click(screen.getByRole("button", { name: "Ukryte" }));
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wszystkie" }));
    fireEvent.change(screen.getByPlaceholderText("Szukaj..."), {
      target: { value: "gamma" },
    });
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("saves the full hidden guild snapshot", async () => {
    render();

    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));

    await waitFor(() =>
      expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          hiddenGuildIds: ["guild-2", "temporarily-unavailable", "guild-1"],
        }),
      ),
    );

    // The save response seeds the cache; no preferences refetch may follow.
    await waitFor(() => expect(harness.queryClient.isMutating()).toBe(0));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(harness.request).toHaveBeenCalledTimes(1);
  });

  it("hides two guilds clicked in quick succession", async () => {
    render();

    // The second click lands before the first save has finished; each write
    // must build on the previous optimistic list, not on the rendered one.
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "Gamma" }));

    await waitFor(() => expect(harness.request).toHaveBeenCalledTimes(2));

    expect(harness.request.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({
        hiddenGuildIds: [
          "guild-2",
          "temporarily-unavailable",
          "guild-1",
          "guild-3",
        ],
      }),
    );

    await waitFor(() => expect(harness.queryClient.isMutating()).toBe(0));
    expect(
      screen.getByRole("button", { name: "Alpha", pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gamma", pressed: false }),
    ).toBeInTheDocument();
  });

  it("shows every guild with one reset action", async () => {
    render();

    fireEvent.click(
      screen.getByRole("button", { name: "Pokaż wszystkie (1)" }),
    );

    await waitFor(() =>
      expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({
          hiddenGuildIds: ["temporarily-unavailable"],
        }),
      ),
    );
  });

  it("hides presence publication controls while preserving stored preferences", () => {
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "20",
        characterId: "10",
        clan: { id: 30, name: "Clan", rank: 1 },
        currentHp: 100,
        icon: "hero.gif",
        level: 100,
        maxHp: 100,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 100, name: "Karka-han", visibility: 0 },
      world: "alpha",
    });
    useSettingsStore.setState({
      guildIdByCharId: { "10": "guild-1" },
      presenceOrganizationIdsByCharId: { "10": ["guild-1"] },
    });

    render();

    expect(
      screen.queryByRole("button", {
        name: "Publikuj obecność w organizacji Alpha",
      }),
    ).not.toBeInTheDocument();
    expect(useSettingsStore.getState().presenceOrganizationIdsByCharId).toEqual(
      {
        "10": ["guild-1"],
      },
    );
  });
});

describe("ServerVisibilitySettingsTab ordering", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.setPreferences({ guildsOrder: ["guild-2", "guild-1"] });
    useGameStore.getState().clearGame();
    useSettingsStore.setState({
      guildIdByCharId: {},
      presenceOrganizationIdsByCharId: {},
    });
  });

  it("moves a server with the keyboard and saves the full order", async () => {
    render();

    const handles = screen.getAllByRole("button", { name: /^Przenieś/ });
    expect(handles.map((handle) => handle.getAttribute("aria-label"))).toEqual([
      "Przenieś Beta (pozycja 1 z 3)",
      "Przenieś Alpha (pozycja 2 z 3)",
      "Przenieś Gamma (pozycja 3 z 3)",
    ]);

    fireEvent.keyDown(handles[2]!, { key: "ArrowUp" });

    await waitFor(() =>
      expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({ guildsOrder: ["guild-2", "guild-3", "guild-1"] }),
      ),
    );
    expect(
      screen
        .getAllByRole("button", { name: /^Przenieś/ })
        .map((handle) => handle.getAttribute("aria-label")),
    ).toEqual([
      "Przenieś Beta (pozycja 1 z 3)",
      "Przenieś Gamma (pozycja 2 z 3)",
      "Przenieś Alpha (pozycja 3 z 3)",
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Gamma: pozycja 2 z 3",
    );
  });

  it("drops a dragged server at the pointer position", async () => {
    render();

    const rows = screen
      .getAllByRole("button", { name: /^Przenieś/ })
      .map((handle) => handle.parentElement!);

    rows.forEach((row, index) => {
      // SAFETY: the hook reads only top and height from the rect.
      row.getBoundingClientRect = () =>
        ({ top: index * 36, height: 36, bottom: index * 36 + 36 }) as DOMRect;
    });

    const [betaHandle] = screen.getAllByRole("button", { name: /^Przenieś/ });

    fireEvent.pointerDown(betaHandle!, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientY: 18,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      pointerType: "mouse",
      buttons: 1,
      clientY: 18 + 72,
    });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(rows[1]).toHaveStyle({ transform: "translate3d(0, -36px, 0)" });
    fireEvent.pointerUp(document, { pointerId: 1, clientY: 18 + 72 });

    await waitFor(() =>
      expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
        JSON.stringify({ guildsOrder: ["guild-1", "guild-3", "guild-2"] }),
      ),
    );
  });

  it("keeps the order fixed while the list is filtered", () => {
    render();

    fireEvent.click(screen.getByRole("button", { name: "Widoczne" }));

    const [handle] = screen.getAllByRole("button", { name: /^Przenieś/ });
    expect(handle).toBeDisabled();
  });
});
