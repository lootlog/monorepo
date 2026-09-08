import type { toast as SonnerToast, Action, ExternalToast } from "sonner";
import {
  act,
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";
import { GuildSwitcher } from "./guild-switcher";

const isToastAction = (action: ExternalToast["action"]): action is Action =>
  typeof action === "object" && action !== null && "onClick" in action;
const mockToastSuccess = vi.hoisted(() => vi.fn<typeof SonnerToast.success>());
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn<typeof SonnerToast.error>(),
    success: mockToastSuccess,
  },
}));
let harness: ReturnType<typeof createGuildPreferencesTest>;
const render = (ui: ReactElement) => renderUi(ui, { wrapper: harness.wrapper });

describe("GuildSwitcher", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGuildPreferencesTest();
    setTestRuntimeGame({ hero: { characterId: "123" } });
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "1",
        characterId: "123",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Map", visibility: 30 },
      world: "tempest",
    });
    useSettingsStore.setState({ guildIdByCharId: {} });
    useWindowsStore.setState((state) => ({
      settings: {
        ...state.settings,
        open: false,
        state: {},
      },
    }));
  });

  it("hides a guild from its context menu and can undo the change", async () => {
    const { rerender } = render(<GuildSwitcher />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "A" }));
    fireEvent.click(
      await screen.findByText("Ukryj w grze", {}, { timeout: 1000 }),
    );

    await waitFor(() =>
      expect(
        harness.request.mock.calls.filter(
          ([, init]) => init?.method === "PATCH",
        ),
      ).toHaveLength(1),
    );
    expect(harness.request.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ hiddenGuildIds: ["guild-1"] }),
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledOnce());
    const action = mockToastSuccess.mock.calls[0]?.[1]?.action;
    if (!isToastAction(action)) throw new Error("Expected undo action");
    act(() =>
      harness.setPreferences({ hiddenGuildIds: ["guild-1", "guild-2"] }),
    );
    rerender(<GuildSwitcher />);
    fireEvent.click(document.body);
    renderUi(<button onClick={action.onClick}>Undo hidden guild</button>);
    fireEvent.click(screen.getByRole("button", { name: "Undo hidden guild" }));
    await waitFor(() =>
      expect(
        harness.request.mock.calls.filter(
          ([, init]) => init?.method === "PATCH",
        ),
      ).toHaveLength(2),
    );
    expect(
      harness.request.mock.calls.filter(
        ([, init]) => init?.method === "PATCH",
      )[1]?.[1]?.body,
    ).toBe(JSON.stringify({ hiddenGuildIds: ["guild-2"] }));
  });

  it("keeps cached guilds visible after a preferences refetch error", async () => {
    render(<GuildSwitcher />);
    harness.request.mockRejectedValue(new Error("refetch failed"));
    await act(async () => {
      await harness.queryClient.refetchQueries({
        queryKey: harness.preferencesKey,
      });
    });

    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not initialize the global selection from an uncontrolled switcher", () => {
    render(<GuildSwitcher />);

    expect(useSettingsStore.getState().guildIdByCharId["123"]).toBeUndefined();
  });

  it("shows a delayed loading status while guilds are unavailable", () => {
    vi.useFakeTimers();
    harness.queryClient.removeQueries({ queryKey: harness.guildsKey });
    harness.request.mockImplementation(() => new Promise(() => {}));

    render(<GuildSwitcher />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie serwerów");
  });

  it("does not write a selection before the character identity is available", () => {
    setTestRuntimeGame({ hero: { characterId: "" } });
    useGameStore.getState().clearGame();
    render(<GuildSwitcher />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({});
  });

  it("stores an explicitly clicked guild for the current character", () => {
    render(<GuildSwitcher />);

    fireEvent.click(screen.getAllByRole("button")[1]);

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({
      "123": "guild-2",
    });
  });

  it("renders guilds in the user preferences order and appends missing guilds", () => {
    harness.setPreferences({ guildsOrder: ["guild-2", "guild-1"] });

    render(<GuildSwitcher />);

    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["B", "A", "G"]);
  });

  it("falls back to the first ordered guild when the current selection is missing", async () => {
    const handleChange = vi.fn<(guildId: string) => void>();

    harness.setPreferences({
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: [],
    });

    render(<GuildSwitcher value="missing-guild" onChange={handleChange} />);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("guild-2");
    });
  });

  it("scrolls horizontally when the user uses the mouse wheel", () => {
    const { container } = render(<GuildSwitcher />);
    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");

    if (!(viewport instanceof HTMLDivElement)) {
      throw new Error("Expected scroll area viewport");
    }

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 100 },
      scrollLeft: { configurable: true, value: 0, writable: true },
      scrollWidth: { configurable: true, value: 300 },
    });

    expect(fireEvent.wheel(viewport, { deltaY: 48 })).toBe(false);
    expect(viewport.scrollLeft).toBe(48);
  });

  it("renders unread badges for guilds and clamps them to 9+", () => {
    render(
      <GuildSwitcher
        allowAll
        value="guild-3"
        unreadCountByGuildId={{
          "guild-1": 3,
          "guild-2": 14,
        }}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("removes hidden guilds and falls back to the first visible guild", async () => {
    const handleChange = vi.fn<(guildId: string) => void>();
    harness.setPreferences({
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: ["guild-2"],
    });

    render(<GuildSwitcher value="guild-2" onChange={handleChange} />);

    expect(screen.queryByText("B")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["A", "G"]);
    await waitFor(() => expect(handleChange).toHaveBeenCalledWith("guild-1"));
  });

  it("does not render a server picker when only one guild is visible", () => {
    harness.setPreferences({
      guildsOrder: [],
      hiddenGuildIds: ["guild-2", "guild-3"],
    });

    render(<GuildSwitcher allowAll value="all" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Wszystkie serwery są ukryte"),
    ).not.toBeInTheDocument();
  });

  it("shows a full-width settings notice when every guild is hidden", () => {
    harness.setPreferences({
      guildsOrder: [],
      hiddenGuildIds: ["guild-1", "guild-2", "guild-3"],
    });

    const { container } = render(<GuildSwitcher allowAll value="all" />);

    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.getByText("Wszystkie serwery są ukryte")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass(
      "ll:h-7",
      "ll:w-full",
      "ll:border-gray-700/90",
      "ll:bg-gray-900/60",
    );
    expect(
      container.querySelector("[data-ll-scroll-area-viewport]"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Otwórz ustawienia" }));

    expect(useWindowsStore.getState().settings).toMatchObject({
      open: true,
      state: {
        activeTab: "servers",
        activeSubsection: "visibility",
      },
    });
  });
});
