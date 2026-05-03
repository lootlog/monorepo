import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type {
  TimerHistoryResponseDto,
  TimerResponseDto,
} from "@/lib/api/generated/main/model";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

const mockGetTimerHistory = vi.fn();
const mockRestoreTimer = vi.fn();
const mockUpsertTimer = vi.fn();

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuItem: ({
    children,
    onSelect,
  }: {
    children: ReactNode;
    onSelect?: (event: { preventDefault: () => void }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect?.({ preventDefault: vi.fn() })}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tile", () => ({
  Tile: ({ children }: { children: ReactNode }) => (
    <div data-testid="history-tile">{children}</div>
  ),
}));

vi.mock("@/hooks/api/use-timers-cache", () => ({
  useTimersCache: () => ({
    upsertTimer: mockUpsertTimer,
  }),
}));

vi.mock("@/api/timers.api", () => ({
  normalizeTimerResponse: (timer: TimerResponseDto) => timer,
}));

vi.mock("@/lib/api/generated/main/timers/timers", () => ({
  getTimersControllerGetTimerHistoryQueryKey: () => ["timer-history"],
  useTimersControllerGetTimerHistory: (...args: unknown[]) =>
    mockGetTimerHistory(...args),
  useTimersControllerRestoreTimerFromHistory: () => ({
    mutate: mockRestoreTimer,
    isPending: false,
  }),
}));

vi.mock("lucide-react", () => ({
  History: () => <span>History</span>,
  Loader2: () => <span>Loader2</span>,
  Plus: () => <span>Plus</span>,
  RotateCcw: () => <span>RotateCcw</span>,
  Trash2: () => <span>Trash2</span>,
  Undo2: () => <span>Undo2</span>,
}));

import { TimerHistoryPopover } from "./timer-history-popover";

const timer = {
  guildId: "guild-1",
  timerKey: "123:tanroth",
  world: "pandora",
} as TimerWithTimeLeft;

const createHistoryEntry = (
  overrides: Partial<TimerHistoryResponseDto> = {},
): TimerHistoryResponseDto =>
  ({
    id: 1,
    guildId: "guild-1",
    guildName: "Lootlog",
    world: "pandora",
    timerKey: "123:tanroth",
    npcId: 123,
    npc: {
      id: 123,
      name: "Tanroth",
      prof: "w",
      location: "",
      wt: "",
      lvl: 120,
      type: "HERO",
      icon: "",
      margonemType: 4,
    },
    action: "DELETE",
    member: {
      id: 10,
      userId: "user-1",
      guildId: "guild-1",
      type: "USER",
      name: "Salvatore",
      active: true,
      roles: [],
      updatedAt: "2026-05-03T10:00:00.000Z",
    },
    actorCharacter: {
      name: "Zorin",
      prof: "BLADE_DANCER",
      icon: "",
      lvl: 300,
      characterId: 100,
      accountId: 200,
    },
    minSpawnTime: "2026-05-03T10:05:00.000Z",
    maxSpawnTime: "2026-05-03T10:10:00.000Z",
    canRestore: true,
    createdAt: "2026-05-03T10:01:02.000Z",
    ...overrides,
  }) as TimerHistoryResponseDto;

describe("TimerHistoryPopover", () => {
  it("renders compact tile entries with details and restore action", async () => {
    const user = userEvent.setup();
    const restoredTimer = { guildId: "guild-1" } as TimerResponseDto;

    mockGetTimerHistory.mockReturnValue({
      data: [createHistoryEntry()],
      isLoading: false,
    });
    mockRestoreTimer.mockImplementation((_payload, options) => {
      options.onSuccess(restoredTimer);
    });

    render(<TimerHistoryPopover timer={timer} />);

    expect(screen.getByTestId("history-tile")).toBeInTheDocument();
    expect(screen.getAllByText("Salvatore (Lootlog)")).toHaveLength(2);
    expect(screen.getAllByText("03.05 12:01:02")).toHaveLength(1);
    expect(screen.getByText("Potwór")).toBeInTheDocument();
    expect(screen.getByText("Tanroth")).toBeInTheDocument();
    expect(screen.getByText("Postać")).toBeInTheDocument();
    expect(screen.getByText("Zorin (300b)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Przywróć timer" }));

    expect(mockRestoreTimer).toHaveBeenCalledWith(
      {
        pathParams: {
          guildId: "guild-1",
          historyEntryId: "1",
        },
      },
      expect.any(Object),
    );
    expect(mockUpsertTimer).toHaveBeenCalledWith(restoredTimer);
  });
});
