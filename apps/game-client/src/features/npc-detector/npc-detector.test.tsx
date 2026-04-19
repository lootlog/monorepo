import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDetectorSettings } from "@/lib/game-account-preferences";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { NpcDetector } from "./npc-detector";
import type * as LootlogTypesModule from "@lootlog/types";

const mockUseCurrentGameAccountDetectorSettings = vi.fn();
const mockGetNpcTypeByWt = vi.fn();
const mockNpcsList = vi.fn();

vi.mock("@/hooks/use-current-game-account-detector-settings", () => ({
  useCurrentGameAccountDetectorSettings: () =>
    mockUseCurrentGameAccountDetectorSettings(),
}));

vi.mock("@lootlog/types", async (importOriginal) => {
  const originalModule = await importOriginal<typeof LootlogTypesModule>();

  return {
    ...originalModule,
    getNpcTypeByWt: (...args: unknown[]) => mockGetNpcTypeByWt(...args),
  };
});

vi.mock("@/features/npc-detector/components/npcs-list", () => ({
  NpcsList: ({ npcs }: { npcs: Array<{ id: number; nick: string }> }) => {
    mockNpcsList(npcs);

    return (
      <div data-testid="npcs-list">
        {npcs.map((npc) => `${npc.id}:${npc.nick}`).join(",")}
      </div>
    );
  },
}));

vi.mock("@/components/animated-window", () => ({
  AnimatedWindow: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (
    <div data-testid="animated-window" data-open={String(isOpen)}>
      {isOpen ? children : null}
    </div>
  ),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    onClose,
    onMaxContentHeightChange,
    actions,
  }: {
    children: React.ReactNode;
    onClose: () => void;
    onMaxContentHeightChange?: (nextMaxContentHeight: number) => void;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="draggable-window">
      <button type="button" onClick={onClose}>
        close
      </button>
      <button type="button" onClick={() => onMaxContentHeightChange?.(420)}>
        change-max-height
      </button>
      {actions}
      {children}
    </div>
  ),
}));

vi.mock("@/components/window-max-height-action", () => ({
  WindowMaxHeightAction: ({
    currentMaxHeight,
  }: {
    currentMaxHeight: number;
  }) => <div data-testid="window-max-height-action">{currentMaxHeight}</div>,
}));

const createNpc = (id: number, nick: string, wt: number) => ({
  id,
  nick,
  x: 10,
  y: 20,
  tpl: 100 + id,
  icon: `${id}.gif`,
  prof: "m",
  wt,
  lvl: 200,
  type: 3,
  location: "Ithan",
  notificationSent: false,
});

describe("NpcDetector", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const settings = createDetectorSettings();
    settings.HERO.detect = true;
    settings.HERO.notifyWindow = true;
    settings.TITAN.detect = false;
    settings.TITAN.notifyWindow = true;

    mockUseCurrentGameAccountDetectorSettings.mockReturnValue({ settings });
    mockGetNpcTypeByWt.mockImplementation((_type, wt) =>
      wt === 80 ? "HERO" : "TITAN",
    );

    useNpcDetectorStore.setState({
      npcs: [],
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
    });

    useWindowsStore.setState((state) => ({
      ...state,
      "npc-detector": {
        ...state["npc-detector"],
        open: true,
        maxContentHeight: undefined,
        size: { width: 300, height: 300 },
      },
    }));
  });

  it("renders the window only when it is open and at least one npc passes filtering", () => {
    useNpcDetectorStore.setState({
      npcs: [createNpc(1, "Allowed", 80), createNpc(2, "Blocked", 120)],
    });

    render(<NpcDetector />);

    expect(screen.getByTestId("animated-window")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByTestId("npcs-list")).toHaveTextContent("1:Allowed");
    expect(screen.getByTestId("npcs-list")).not.toHaveTextContent("Blocked");
    expect(mockNpcsList).toHaveBeenCalledWith([
      expect.objectContaining({ id: 1, nick: "Allowed" }),
    ]);
  });

  it("does not render the window content when filtering removes every npc", () => {
    useNpcDetectorStore.setState({
      npcs: [createNpc(2, "Blocked", 120)],
    });

    render(<NpcDetector />);

    expect(screen.getByTestId("animated-window")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByTestId("draggable-window")).not.toBeInTheDocument();
  });

  it("closes the detector and clears npcs when the window is closed", () => {
    useNpcDetectorStore.setState({
      npcs: [createNpc(1, "Allowed", 80)],
    });

    render(<NpcDetector />);

    fireEvent.click(screen.getByRole("button", { name: "close" }));

    expect(useWindowsStore.getState()["npc-detector"].open).toBe(false);
    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("syncs the max height action with the stored max content height and persists updates", async () => {
    useNpcDetectorStore.setState({
      npcs: [createNpc(1, "Allowed", 80)],
    });

    render(<NpcDetector />);

    expect(screen.getByTestId("window-max-height-action")).toHaveTextContent(
      "300",
    );

    act(() => {
      useWindowsStore.getState().setMaxContentHeight("npc-detector", 180);
    });

    await waitFor(() => {
      expect(screen.getByTestId("window-max-height-action")).toHaveTextContent(
        "180",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "change-max-height" }));

    expect(useWindowsStore.getState()["npc-detector"].maxContentHeight).toBe(
      420,
    );
  });
});
