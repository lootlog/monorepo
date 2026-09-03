// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  useEventsRankingControllerGetEventHeroStats,
  useShowEventOverview,
} from "@lootlog/client/main";
import { EventKillsHistoryContent } from "./event-kills-history-content";
import { useEventKillHistory } from "./hooks/queries/use-event-kill-history";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getEventsRankingControllerGetEventHeroStatsQueryKey: vi.fn(() => [
    "hero-stats",
  ]),
  getShowEventOverviewQueryKey: vi.fn(() => ["event-overview"]),
  useEventsRankingControllerGetEventHeroStats: vi.fn(),
  useShowEventOverview: vi.fn(),
}));

vi.mock("@lootlog/ui/components/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("./hooks/queries/use-event-kill-history", () => ({
  useEventKillHistory: vi.fn(),
}));

vi.mock("./components/dialogs/event-participation-confirmation-dialog", () => ({
  EventParticipationConfirmationDialog: () => null,
}));

vi.mock("./components/kills/event-kills-filter", () => ({
  EventKillsFilter: ({
    onSelectedHeroChange,
  }: {
    onSelectedHeroChange: (heroId?: string) => void;
  }) => (
    <button type="button" onClick={() => onSelectedHeroChange("hero-2")}>
      select hero
    </button>
  ),
}));

vi.mock("./components/kills/event-kills-summary", () => ({
  EventKillsSummary: ({
    killCount,
    isKillCountLoading,
  }: {
    killCount?: number;
    isKillCountLoading?: boolean;
  }) => (
    <div data-testid="summary">
      {isKillCountLoading ? "loading" : String(killCount)}
    </div>
  ),
}));

vi.mock("./components/kills/event-kills-table", () => ({
  EventKillsTable: () => null,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EventKillsHistoryContent", () => {
  it("derives exact all-hero and selected-hero kill counts from one event query", () => {
    vi.mocked(useShowEventOverview).mockReturnValue({
      data: {
        heroNpcs: [
          { id: "hero-1", npcName: "Zorin" },
          { id: "hero-2", npcName: "Maddok" },
        ],
        name: "Wakacje 2026",
      },
      error: null,
      isLoading: false,
    } as ReturnType<typeof useShowEventOverview>);
    vi.mocked(useEventKillHistory).mockReturnValue({
      data: { pages: [] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isError: false,
      isFetchingNextPage: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useEventKillHistory>);
    vi.mocked(useEventsRankingControllerGetEventHeroStats).mockReturnValue({
      data: [
        { heroId: "hero-1", killCount: 3 },
        { heroId: "hero-2", killCount: 7 },
      ],
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useEventsRankingControllerGetEventHeroStats>);

    render(<EventKillsHistoryContent guildId="guild-1" eventId="event-1" />);

    expect(screen.getByTestId("summary").textContent).toBe("10");

    fireEvent.click(screen.getByRole("button", { name: "select hero" }));

    expect(screen.getByTestId("summary").textContent).toBe("7");
    expect(
      vi.mocked(getEventsRankingControllerGetEventHeroStatsQueryKey),
    ).toHaveBeenCalledWith({ eventId: "event-1", guildId: "guild-1" });
    for (const [pathParameters] of vi.mocked(
      useEventsRankingControllerGetEventHeroStats,
    ).mock.calls) {
      expect(pathParameters).toEqual({
        eventId: "event-1",
        guildId: "guild-1",
      });
    }
  });
});
