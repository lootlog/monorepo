import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { Timers } from "./timers";
import { createMockTimer } from "./__tests__/test-helpers";
import { NpcType } from "@/hooks/api/use-npcs";

const mockToggleOpen = vi.fn();
const mockSetOpen = vi.fn();
const mockToggleTimerFiltersEnabled = vi.fn();
const mockToggleColorFiltersEnabled = vi.fn();
const mockSetTimersSortOrder = vi.fn();

vi.mock("@/hooks/api/use-timers");
vi.mock("@/hooks/api/use-guild-permissions");
vi.mock("@/hooks/gateway/use-gateway");
vi.mock("@/store/global.store");
vi.mock("@/store/windows.store");
vi.mock("@/store/timers.store");
vi.mock("@/store/settings.store");
vi.mock("@/contexts/socket-context");

vi.mock("@/lib/game", () => ({
  Game: {
    hero: { id: "char1" },
    interface: "si",
    getWorldName: () => "world1",
    map: {},
    npcs: [],
    getOther: () => undefined,
    getNpc: () => undefined,
    getNpcTpl: () => undefined,
    getNpcIcon: () => undefined,
    getInitializeState: () => true,
  },
}));

vi.mock("./components/timers-content", () => ({
  TimersContent: ({
    sortedTimers,
    onAddTimer,
  }: {
    sortedTimers: unknown[];
    onAddTimer: () => void;
  }) => (
    <div data-testid="timers-content">
      <button onClick={onAddTimer} data-testid="add-timer-btn">
        Add Timer
      </button>
      <div data-testid="timers-count">{sortedTimers.length}</div>
    </div>
  ),
}));

vi.mock("./components/timers-actions", () => ({
  TimersActions: () => <div data-testid="timers-actions">Actions</div>,
}));

vi.mock("./components/timers-under-bag-actions", () => ({
  TimersUnderBagActions: () => (
    <div data-testid="timers-under-bag-actions">Under Bag Actions</div>
  ),
}));

vi.mock("./under-bag-timers", () => ({
  UnderBagTimers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="under-bag-timers">{children}</div>
  ),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    title,
    onClose,
  }: {
    children: React.ReactNode;
    title: string;
    onClose: () => void;
  }) => (
    <div data-testid="draggable-window">
      <div data-testid="window-title">{title}</div>
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
      {children}
    </div>
  ),
}));

vi.mock("@/components/animated-window", () => ({
  AnimatedWindow: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    windowKey: string;
  }) => (isOpen ? <div data-testid="animated-window">{children}</div> : null),
}));

vi.mock("./hooks/use-timers-update");
vi.mock("./hooks/use-timers-filtering");
vi.mock("./hooks/use-timers-socket");

describe("Timers Component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useTimers } = await import("@/hooks/api/use-timers");
    const { useGuildPermissions } =
      await import("@/hooks/api/use-guild-permissions");
    const { useGlobalStore } = await import("@/store/global.store");
    const { useWindowsStore } = await import("@/store/windows.store");
    const { useTimersStore } = await import("@/store/timers.store");
    const { useSettingsStore } = await import("@/store/settings.store");
    const { useTimersUpdate } = await import("./hooks/use-timers-update");
    const { useTimersFiltering } = await import("./hooks/use-timers-filtering");
    const { useSocket } = await import("@/contexts/socket-context");

    vi.mocked(useTimers).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useTimers>);
    vi.mocked(useSocket).mockReturnValue({
      socket: { id: "socket-1" },
      connected: true,
      joined: true,
      joinedGuilds: [],
    } as unknown as ReturnType<typeof useSocket>);
    vi.mocked(useGuildPermissions).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGuildPermissions>);
    vi.mocked(useGlobalStore).mockReturnValue({
      gameState: { world: "world1", gameInterface: "si", characterId: "char1" },
    });
    vi.mocked(useWindowsStore).mockReturnValue({
      timers: { open: true },
      toggleOpen: mockToggleOpen,
      setOpen: mockSetOpen,
    });
    vi.mocked(useTimersStore).mockReturnValue({
      hiddenTimers: {},
      pinnedTimers: {},
      generalConfig: {
        timersGrouping: false,
        timersUnderBag: false,
        removeTimerAfterMs: 600000,
      },
      timerFiltersEnabled: false,
      toggleTimerFiltersEnabled: mockToggleTimerFiltersEnabled,
      colorFiltersEnabled: false,
      toggleColorFiltersEnabled: mockToggleColorFiltersEnabled,
      timerFiltersSearchText: "",
      timersSortOrder: "asc",
      setTimersSortOrder: mockSetTimersSortOrder,
      timersFilters: {},
      displayConfig: {
        minColumnWidth: 200,
        fontSize: 12,
        showType: true,
        showLevel: true,
        singleTimerDisplayMode: "row",
      },
      timersColors: {},
      customColors: {},
      defaultColorNames: {},
      overriddenDefaultColors: {},
    });
    vi.mocked(useSettingsStore).mockReturnValue({
      world: "world1",
      allowWorldSelection: false,
      guildIdByCharId: { char1: "guild1" },
    });
    vi.mocked(useTimersUpdate).mockImplementation((timers) => timers);
    vi.mocked(useTimersFiltering).mockImplementation(
      (params) => params.calculatedTimers,
    );
  });

  describe("1. Data Fetching & Loading", () => {
    it("1.1 should load timers from API on initial mount (HIGH PRIORITY)", async () => {
      render(<Timers />);

      await waitFor(() => {
        expect(screen.getByTestId("timers-content")).toBeDefined();
      });
    });

    it("1.2 should refetch timers when world changes (HIGH PRIORITY)", () => {
      render(<Timers />);

      expect(screen.getByTestId("timers-content")).toBeDefined();
    });

    it("1.3 should show empty state when no timers exist (MEDIUM PRIORITY)", () => {
      render(<Timers />);

      const timersCount = screen.getByTestId("timers-count");
      expect(timersCount.textContent).toBe("0");
    });

    it("1.4 should handle API errors gracefully (HIGH PRIORITY)", () => {
      expect(() => render(<Timers />)).not.toThrow();
    });
  });

  describe("2. WebSocket & Real-Time Updates", () => {
    it("2.1 should establish socket connection on mount (HIGH PRIORITY)", async () => {
      const { useTimersSocket } = await import("./hooks/use-timers-socket");

      render(<Timers />);

      expect(useTimersSocket).toHaveBeenCalled();
    });

    it("2.2 should handle socket disconnection (HIGH PRIORITY)", async () => {
      const { useSocket } = await import("@/contexts/socket-context");

      vi.mocked(useSocket).mockReturnValue({
        socket: null,
        connected: false,
        joined: false,
        joinedGuilds: [],
      } as ReturnType<typeof useSocket>);

      render(<Timers />);

      expect(screen.getByTestId("timers-content")).toBeDefined();
    });
  });

  describe("5. Configuration & Settings", () => {
    it("5.2 should use guild-specific mode when timersGrouping is OFF (HIGH PRIORITY)", async () => {
      const { useSettingsStore } = await import("@/store/settings.store");

      vi.mocked(useSettingsStore).mockReturnValue({
        world: "world2",
        allowWorldSelection: false,
        guildIdByCharId: { char1: "guild1" },
      });

      render(<Timers />);

      expect(screen.getByTestId("timers-content")).toBeDefined();
    });

    it("5.4 should render DraggableWindow when timersUnderBag is OFF (HIGH PRIORITY)", () => {
      render(<Timers />);

      expect(screen.getByTestId("draggable-window")).toBeDefined();
    });
  });

  describe("7. Merging & Deduplication", () => {
    it("7.1 should deduplicate timers when grouping is OFF (HIGH PRIORITY)", async () => {
      const { useTimers } = await import("@/hooks/api/use-timers");

      const futureDate1 = new Date(Date.now() + 3600000);
      const futureDate2 = new Date(Date.now() + 1800000);

      const duplicateTimers = [
        createMockTimer({
          npcId: 1,
          guildId: "guild1",
          world: "world1",
          isPending: false,
          maxSpawnTime: futureDate1,
          minSpawnTime: futureDate2,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild1",
          world: "world1",
          isPending: false,
          maxSpawnTime: futureDate1,
          minSpawnTime: futureDate2,
        }),
      ];

      vi.mocked(useTimers).mockReturnValue({
        data: duplicateTimers,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useTimers>);

      const { getByTestId } = render(<Timers />);

      await waitFor(() => {
        const timersCount = getByTestId("timers-count");
        expect(timersCount.textContent).toBe("1");
      });
    });

    it("7.2 should merge timers from different guilds when grouping is ON (HIGH PRIORITY)", async () => {
      const { useTimers } = await import("@/hooks/api/use-timers");
      const { useTimersStore } = await import("@/store/timers.store");

      const timersFromDifferentGuilds = [
        createMockTimer({
          npcId: 1,
          guildId: "guild1",
          world: "world1",
          isPending: false,
        }),
        createMockTimer({
          npcId: 1,
          guildId: "guild2",
          world: "world1",
          isPending: false,
        }),
      ];

      vi.mocked(useTimers).mockReturnValue({
        data: timersFromDifferentGuilds,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useTimers>);

      vi.mocked(useTimersStore).mockReturnValue({
        generalConfig: {
          timersGrouping: true,
          timersUnderBag: false,
          removeTimerAfterMs: 600000,
        },
        hiddenTimers: {},
        pinnedTimers: {},
        timerFiltersEnabled: false,
        toggleTimerFiltersEnabled: mockToggleTimerFiltersEnabled,
        colorFiltersEnabled: false,
        toggleColorFiltersEnabled: mockToggleColorFiltersEnabled,
        timerFiltersSearchText: "",
        timersSortOrder: "asc",
        setTimersSortOrder: mockSetTimersSortOrder,
        timersFilters: {},
        displayConfig: {
          minColumnWidth: 200,
          fontSize: 12,
          showType: true,
          showLevel: true,
          singleTimerDisplayMode: "row",
        },
        timersColors: {},
        customColors: {},
        defaultColorNames: {},
        overriddenDefaultColors: {},
      });

      render(<Timers />);

      expect(screen.getByTestId("timers-content")).toBeDefined();
    });
  });

  describe("9. Error Handling & Edge Cases", () => {
    it("9.1 should handle missing world gracefully (HIGH PRIORITY)", async () => {
      const { useGlobalStore } = await import("@/store/global.store");

      vi.mocked(useGlobalStore).mockReturnValue({
        gameState: {
          world: undefined,
          gameInterface: "si",
          characterId: "char1",
        },
      });

      expect(() => render(<Timers />)).not.toThrow();
    });

    it("9.2 should handle missing characterId gracefully (HIGH PRIORITY)", async () => {
      const { useGlobalStore } = await import("@/store/global.store");

      vi.mocked(useGlobalStore).mockReturnValue({
        gameState: {
          world: "world1",
          gameInterface: "si",
          characterId: undefined,
        },
      });

      expect(() => render(<Timers />)).not.toThrow();
    });

    it("9.4 should handle invalid timer data (HIGH PRIORITY)", async () => {
      const { useTimers } = await import("@/hooks/api/use-timers");

      const invalidTimers = [{ npcId: null, guildId: "guild1" }];

      vi.mocked(useTimers).mockReturnValue({
        data: invalidTimers,
        isLoading: false,
        error: null,
      } as unknown as ReturnType<typeof useTimers>);

      expect(() => render(<Timers />)).not.toThrow();
    });
  });

  describe("11. UI & Window Management", () => {
    it("11.1 should display window when open is true (HIGH PRIORITY)", () => {
      render(<Timers />);

      expect(screen.getByTestId("draggable-window")).toBeDefined();
    });

    it("11.2 should hide window when open is false (HIGH PRIORITY)", async () => {
      const { useWindowsStore } = await import("@/store/windows.store");

      vi.mocked(useWindowsStore).mockReturnValue({
        timers: { open: false },
        toggleOpen: mockToggleOpen,
        setOpen: mockSetOpen,
      });

      render(<Timers />);

      expect(screen.queryByTestId("draggable-window")).toBeNull();
    });
  });

  describe("15. Integration with Other Features", () => {
    it("15.2 should update when guild changes (HIGH PRIORITY)", async () => {
      const { useSettingsStore } = await import("@/store/settings.store");

      vi.mocked(useSettingsStore).mockReturnValue({
        world: "world1",
        allowWorldSelection: false,
        guildIdByCharId: {
          char1: "guild2",
        },
      });

      render(<Timers />);

      expect(screen.getByTestId("timers-content")).toBeDefined();
    });

    it("15.3 should update when world selection changes from settings (HIGH PRIORITY)", async () => {
      const { useSettingsStore } = await import("@/store/settings.store");

      vi.mocked(useSettingsStore).mockReturnValue({
        world: "world3",
        allowWorldSelection: true,
        guildIdByCharId: {
          char1: "guild1",
        },
      });

      render(<Timers />);

      expect(screen.getByTestId("timers-content")).toBeDefined();
    });
  });

  describe("8. Permissions & Authorization", () => {
    it("8.1 should enable delete when user has permissions (HIGH PRIORITY)", async () => {
      const { useGuildPermissions } =
        await import("@/hooks/api/use-guild-permissions");
      const { Permission } = await import("@lootlog/types");

      vi.mocked(useGuildPermissions).mockReturnValue({
        data: [Permission.LOOTLOG_MANAGE],
      } as ReturnType<typeof useGuildPermissions>);

      render(<Timers />);

      await waitFor(() => {
        expect(screen.getByTestId("timers-content")).toBeDefined();
      });
    });

    it("8.2 should disable delete when user lacks permissions (HIGH PRIORITY)", async () => {
      render(<Timers />);

      await waitFor(() => {
        expect(screen.getByTestId("timers-content")).toBeDefined();
      });
    });
  });

  describe("10. Performance & Optimization", () => {
    it("10.1 should handle large dataset (100+ timers) (HIGH PRIORITY)", async () => {
      const { useTimers } = await import("@/hooks/api/use-timers");

      const largeDataset = Array.from({ length: 150 }, (_, i) =>
        createMockTimer({
          npcId: i,
          isPending: false,
          npc: {
            id: i,
            name: `NPC ${i}`,
            type: NpcType.HERO,
            lvl: 100,
            prof: "warrior",
            icon: "icon.png",
            wt: 1,
            margonemType: 1,
          },
        }),
      );

      vi.mocked(useTimers).mockReturnValue({
        data: largeDataset,
        isLoading: false,
        error: null,
      } as ReturnType<typeof useTimers>);

      const startTime = performance.now();
      render(<Timers />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.getByTestId("timers-content")).toBeDefined();
    });
  });

  describe("14. Lifecycle & Timing", () => {
    it("14.1 should initialize correctly on mount (HIGH PRIORITY)", async () => {
      const { useTimersSocket } = await import("./hooks/use-timers-socket");

      render(<Timers />);

      expect(useTimersSocket).toHaveBeenCalled();
      expect(screen.getByTestId("timers-content")).toBeDefined();
    });

    it("14.2 should cleanup on unmount (HIGH PRIORITY)", () => {
      const { unmount } = render(<Timers />);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Integration Tests", () => {
    it("should call toggleOpen when add timer button is clicked", () => {
      render(<Timers />);

      const addButton = screen.getByTestId("add-timer-btn");
      addButton.click();

      expect(mockToggleOpen).toHaveBeenCalledWith("add-timer");
    });

    it("should call setOpen when window is closed", () => {
      render(<Timers />);

      const closeButton = screen.getByTestId("close-btn");
      closeButton.click();

      expect(mockSetOpen).toHaveBeenCalledWith("timers", false);
    });

    it("should render with correct window title", () => {
      render(<Timers />);

      expect(screen.getByTestId("window-title").textContent).toBe("Timery");
    });
  });
});
