// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/api-client/transport";
import type { EventRanking } from "../../types/api";
import { EventRankingTable } from "./event-ranking-table";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("EventRankingTable", () => {
  let restoreApiClients: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify([]), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    restoreApiClients = configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: mocks.fetch,
      },
    });
  });

  afterEach(() => {
    cleanup();
    restoreApiClients();
  });

  it("does not request edit history while ranking rows are closed", () => {
    renderRankingTable([
      createRanking({ id: "ranking-1", memberId: 1 }),
      createRanking({ id: "ranking-2", memberId: 2 }),
    ]);

    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("exposes the edit history action with an accessible name", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })]);

    expect(
      screen.getByRole("button", { name: "events.points.history" }),
    ).toBeTruthy();
  });

  it("renders the embedded history without another request", async () => {
    renderRankingTable([
      createRanking({
        editHistory: [
          {
            id: "history-1",
            rankingId: "ranking-1",
            previousPoints: 80,
            newPoints: 100,
            deltaPoints: 20,
            editType: "RANKING",
            editedByUserId: "editor-1",
            editedByName: "Editor",
            comment: "Correction",
            editedAt: "2026-07-28T12:00:00.000Z",
          },
        ],
        id: "ranking-1",
        memberId: 1,
      }),
      createRanking({ id: "ranking-2", memberId: 2 }),
    ]);

    const [historyButton] = screen.getAllByRole("button", {
      name: "events.points.history",
    });
    if (!historyButton) {
      throw new Error("Expected an edit history button");
    }

    fireEvent.click(historyButton);

    expect(await screen.findByText("Correction")).toBeTruthy();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("does not expose history without modified points", () => {
    renderRankingTable([
      createRanking({
        id: "ranking-1",
        memberId: 1,
        pointsModified: false,
      }),
    ]);

    expect(
      screen.queryByRole("button", { name: "events.points.history" }),
    ).toBeNull();
  });

  it("does not expose history without edit access", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })], {
      canEdit: false,
    });

    expect(
      screen.queryByRole("button", { name: "events.points.history" }),
    ).toBeNull();
  });

  it("does not request history without guild and event identifiers", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })], {
      eventId: "",
      guildId: "",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "events.points.history" }),
    );
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

type RankingTableOptions = {
  canEdit?: boolean;
  eventId?: string;
  guildId?: string;
};

function renderRankingTable(
  rankings: EventRanking[],
  options: RankingTableOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EventRankingTable
        rankings={rankings}
        guildId={options.guildId ?? "guild-1"}
        eventId={options.eventId ?? "event-1"}
        canEdit={options.canEdit ?? true}
      />
    </QueryClientProvider>,
  );
}

function createRanking({
  editHistory = [],
  id,
  memberId,
  pointsModified = true,
}: {
  editHistory?: EventRanking["editHistory"];
  id: string;
  memberId: number;
  pointsModified?: boolean;
}): EventRanking {
  return {
    id,
    eventId: "event-1",
    memberId,
    heroNpcName: "Mushita",
    totalPoints: 100,
    totalKills: 2,
    totalTimeSeconds: 60,
    avgAfkPercentage: 0,
    editHistory,
    pointsModified,
    updatedAt: "2026-07-28T12:00:00.000Z",
    member: {
      id: memberId,
      name: `Member ${memberId}`,
    },
  };
}
