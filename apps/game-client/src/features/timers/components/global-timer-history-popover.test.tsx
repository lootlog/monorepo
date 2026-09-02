import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type {
  TimerHistoryResponseDto,
  TimerResponseDto,
} from "@lootlog/client/main";

const mockGetRecentTimerHistory = vi.fn();
const mockRestoreTimer = vi.fn();
const mockUpsertTimer = vi.fn();

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

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getTimersControllerGetRecentTimerHistoryQueryKey: (params: unknown) => [
    "recent-timer-history",
    params,
  ],
  useTimersControllerGetRecentTimerHistory: (...args: unknown[]) =>
    mockGetRecentTimerHistory(...args),
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

import { GlobalTimerHistoryPopover } from "./global-timer-history-popover";

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
    minSpawnTime: new Date(2026, 4, 3, 12, 5).toISOString(),
    maxSpawnTime: new Date(2026, 4, 3, 12, 10).toISOString(),
    canRestore: true,
    createdAt: new Date(2026, 4, 3, 12, 1, 2).toISOString(),
    ...overrides,
  }) as TimerHistoryResponseDto;

describe("GlobalTimerHistoryPopover", () => {
  it("queries guild history and renders compact tile entries", async () => {
    const user = userEvent.setup();
    const restoredTimer = { guildId: "guild-1" } as TimerResponseDto;

    mockGetRecentTimerHistory.mockReturnValue({
      data: [createHistoryEntry()],
      isLoading: false,
    });
    mockRestoreTimer.mockImplementation((_payload, options) => {
      options.onSuccess(restoredTimer);
    });

    render(<GlobalTimerHistoryPopover guildId="guild-1" world="pandora" />);

    expect(mockGetRecentTimerHistory).toHaveBeenCalledWith(
      {
        guildId: "guild-1",
        world: "pandora",
        limit: 10,
      },
      expect.objectContaining({
        query: expect.objectContaining({
          queryKey: [
            "recent-timer-history",
            {
              guildId: "guild-1",
              world: "pandora",
              limit: 10,
            },
          ],
        }),
      }),
    );
    expect(screen.getByTestId("history-tile")).toBeInTheDocument();
    expect(screen.getAllByText("Salvatore (Lootlog)")).toHaveLength(1);
    await user.hover(screen.getByTestId("history-tile"));
    expect(screen.getAllByText("Salvatore (Lootlog)")).toHaveLength(2);
    expect(screen.getAllByText("12:01:02")).toHaveLength(1);
    expect(screen.getByText("Potwór")).toBeInTheDocument();
    expect(screen.getAllByText("Tanroth")).toHaveLength(2);
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
