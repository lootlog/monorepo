// @vitest-environment happy-dom

import { Profiler, type ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/api-client/transport";
import type { EventRanking } from "../../types/api";
import { EventRankingTable } from "./event-ranking-table";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    "aria-label": ariaLabel,
    className,
    tabIndex,
  }: {
    children?: ReactNode;
    params: Record<string, string>;
    "aria-label"?: string;
    className?: string;
    tabIndex?: number;
  }) => (
    <a
      href={`/${params.guildId}/events/${params.eventId}/members/${params.memberId}`}
      aria-label={ariaLabel}
      className={className}
      tabIndex={tabIndex}
    >
      {children}
    </a>
  ),
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

  it("does not enter an update loop after an external rerender", async () => {
    const ranking = createRanking({ id: "ranking-1", memberId: 1 });
    const queryClient = new QueryClient();
    let commitCount = 0;
    const createRankingTable = () => (
      <QueryClientProvider client={queryClient}>
        <Profiler id="ranking" onRender={() => (commitCount += 1)}>
          <EventRankingTable rankings={[ranking]} variant="compact" />
        </Profiler>
      </QueryClientProvider>
    );
    const { rerender } = render(createRankingTable());
    await act(() => Promise.resolve());
    const commitsAfterMount = commitCount;

    rerender(createRankingTable());
    await act(() => Promise.resolve());

    expect(commitCount - commitsAfterMount).toBeLessThanOrEqual(2);
  });

  it("presents a semantic leaderboard and links its data cells", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })]);

    expect(screen.getByRole("table")).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.player" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.kills" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.time" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.afk" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.points" }),
    ).toBeTruthy();
    expect(screen.getByText("1m")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();

    const primaryLink = screen.getByRole("link", {
      name: "events.ranking.openMemberStats",
    });
    expect(primaryLink.getAttribute("href")).toBe(
      "/guild-1/events/event-1/members/1",
    );
    expect(primaryLink.tabIndex).toBe(0);
    expect(
      screen
        .getAllByRole("link")
        .filter((link) => link !== primaryLink)
        .every((link) => link.tabIndex === -1),
    ).toBe(true);
  });

  it("renders the shared table without nested card styling in compact mode", () => {
    const { container } = renderRankingTable(
      [createRanking({ id: "ranking-1", memberId: 1 })],
      { variant: "compact" },
    );

    const section = container.querySelector("section");
    const headers = screen.getAllByRole("columnheader");
    const pointsCell = container.querySelector("tbody td:last-child");

    expect(headers).toHaveLength(4);
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.player" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.points" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "events.ranking.kills" }),
    ).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(section?.className).not.toContain("border-border");
    expect(section?.className).not.toContain("rounded-2xl");
    expect(pointsCell?.className).toContain("pr-3!");
    expect(
      screen.queryByRole("button", { name: "events.ranking.moreActions" }),
    ).toBeNull();
  });

  it("gives compact rankings a narrow responsive points column", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })], {
      variant: "compact",
    });

    const pointsHeader = screen.getByRole("columnheader", {
      name: "events.ranking.points",
    });

    expect(pointsHeader.className).toContain("w-20");
    expect(pointsHeader.className).toContain("@md/ranking:w-28");
    expect(pointsHeader.className).not.toContain("md:w-36");
  });

  it("preserves the wider points column in the full ranking", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })]);

    const pointsHeader = screen.getByRole("columnheader", {
      name: "events.ranking.points",
    });

    expect(pointsHeader.className).toContain("w-28");
    expect(pointsHeader.className).toContain("md:w-36");
    expect(pointsHeader.className).not.toContain("w-20");
  });

  it("shows kills only when the ranking widget is wide enough", () => {
    const { container } = renderRankingTable(
      [createRanking({ id: "ranking-1", memberId: 1 })],
      { variant: "compact" },
    );

    const section = container.querySelector("section");
    const killsHeader = screen.getByRole("columnheader", {
      name: "events.ranking.kills",
    });

    expect(section?.className).toContain("@container/ranking");
    expect(killsHeader.classList.contains("hidden")).toBe(true);
    expect(killsHeader.classList.contains("@md/ranking:table-cell")).toBe(true);
    expect(killsHeader.classList.contains("md:table-cell")).toBe(false);
  });

  it("uses compact typography until the ranking widget becomes wide", () => {
    const { container } = renderRankingTable(
      [createRanking({ id: "ranking-1", memberId: 1 })],
      { variant: "compact" },
    );

    const memberName = screen.getByText("Member 1");
    const pointsValue = container.querySelector(
      "tbody td:last-child .font-bold",
    );

    expect(memberName.classList.contains("text-xs")).toBe(true);
    expect(memberName.classList.contains("@md/ranking:text-sm")).toBe(true);
    expect(pointsValue?.classList.contains("text-sm")).toBe(true);
    expect(pointsValue?.classList.contains("@md/ranking:text-base")).toBe(true);
  });

  it("keeps point sorting and formats non-zero AFK values", () => {
    renderRankingTable([
      createRanking({
        avgAfkPercentage: 2.6,
        id: "ranking-low",
        memberId: 1,
        totalPoints: 50,
      }),
      createRanking({
        id: "ranking-high",
        memberId: 2,
        totalPoints: 103.5,
      }),
    ]);

    const rankingRows = screen.getAllByRole("row").slice(1);
    expect(rankingRows[0]?.textContent).toContain("Member 2");
    expect(rankingRows[0]?.textContent).toContain("103.50");
    expect(rankingRows[1]?.textContent).toContain("Member 1");
    expect(screen.getByText("3%")).toBeTruthy();
  });

  it("uses the member role color and preserves the default color without one", () => {
    renderRankingTable([
      createRanking({
        id: "ranking-colored",
        memberId: 1,
        roleColor: 0x25a7e8,
      }),
      createRanking({ id: "ranking-default", memberId: 2 }),
    ]);

    expect(screen.getByText("Member 1").style.color).toBe("#25A7E8");
    expect(screen.getByText("Member 2").getAttribute("style")).toBeNull();
  });

  it("keeps distinct medal treatments for the top three positions", () => {
    const { container } = renderRankingTable([
      createRanking({ id: "ranking-1", memberId: 1, totalPoints: 40 }),
      createRanking({ id: "ranking-2", memberId: 2, totalPoints: 30 }),
      createRanking({ id: "ranking-3", memberId: 3, totalPoints: 20 }),
      createRanking({ id: "ranking-4", memberId: 4, totalPoints: 10 }),
    ]);

    const positionBadges = container.querySelectorAll(
      "tbody tr td:first-child span",
    );

    expect(positionBadges[0]?.className).toContain("bg-yellow-500");
    expect(positionBadges[0]?.className).toContain("rounded-full");
    expect(positionBadges[0]?.className).toContain("shrink-0");
    expect(positionBadges[1]?.className).toContain("bg-gray-300");
    expect(positionBadges[2]?.className).toContain("bg-amber-700");
    expect(positionBadges[3]?.className).toContain("bg-muted");
  });

  it("right-aligns every numeric data cell", () => {
    const { container } = renderRankingTable([
      createRanking({ avgAfkPercentage: 3, id: "ranking-1", memberId: 1 }),
    ]);

    const linkedNumericCells = container.querySelectorAll(
      "tbody tr td:nth-child(3) a, tbody tr td:nth-child(4) a, tbody tr td:nth-child(5) a",
    );
    const pointsCell = container.querySelector("tbody tr td:nth-child(6)");

    expect(linkedNumericCells).toHaveLength(3);
    expect(
      [...linkedNumericCells].every((cell) =>
        cell.className.includes("justify-end"),
      ),
    ).toBe(true);
    expect(pointsCell?.className).toContain("text-right");
  });

  it("highlights the current guild member", () => {
    const { container } = renderRankingTable(
      [
        createRanking({ id: "ranking-1", memberId: 1 }),
        createRanking({ id: "ranking-2", memberId: 2 }),
      ],
      { currentMemberId: 2 },
    );

    const highlightedRows = container.querySelectorAll(
      '[aria-selected="true"]',
    );

    expect(highlightedRows).toHaveLength(1);
    expect(highlightedRows[0]?.textContent).toContain("Member 2");
  });

  it("marks manually modified points next to their value", () => {
    renderRankingTable(
      [createRanking({ id: "ranking-1", memberId: 1, pointsModified: true })],
      { canEdit: false },
    );

    expect(screen.getByLabelText("events.points.modified")).toBeTruthy();
  });

  it("exposes the edit history action with an accessible name", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })]);

    expect(
      screen.getByRole("button", { name: "events.points.history" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "events.ranking.moreActions" }),
    ).toBeTruthy();
  });

  it("keeps mobile actions outside the member link", () => {
    renderRankingTable([createRanking({ id: "ranking-1", memberId: 1 })]);

    const mobileActions = screen.getByRole("button", {
      name: "events.ranking.moreActions",
    });

    expect(mobileActions.closest("a")).toBeNull();
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
  currentMemberId?: number;
  eventId?: string;
  guildId?: string;
  variant?: "default" | "compact";
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
        currentMemberId={options.currentMemberId}
        variant={options.variant}
      />
    </QueryClientProvider>,
  );
}

function createRanking({
  avgAfkPercentage = 0,
  editHistory = [],
  id,
  memberId,
  pointsModified = true,
  roleColor,
  totalPoints = 100,
}: {
  avgAfkPercentage?: number;
  editHistory?: EventRanking["editHistory"];
  id: string;
  memberId: number;
  pointsModified?: boolean;
  roleColor?: number;
  totalPoints?: number;
}): EventRanking {
  return {
    id,
    eventId: "event-1",
    memberId,
    heroNpcName: "Mushita",
    totalPoints,
    totalKills: 2,
    totalTimeSeconds: 60,
    avgAfkPercentage,
    editHistory,
    pointsModified,
    updatedAt: "2026-07-28T12:00:00.000Z",
    member: {
      id: memberId,
      name: `Member ${memberId}`,
      roles:
        roleColor === undefined
          ? []
          : [
              {
                color: roleColor,
                position: 1,
              },
            ],
    },
  };
}
