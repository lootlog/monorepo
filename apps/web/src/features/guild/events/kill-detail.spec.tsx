// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KillDetail } from "./kill-detail";

const mocks = vi.hoisted(() => ({
  useKillDetail: vi.fn(),
  useMatchingLoots: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    guildId: "guild-1",
    eventId: "event-1",
    heroId: "hero-1",
    killId: "kill-1",
  }),
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/hero">{children}</a>
  ),
}));

vi.mock("./hooks/queries/use-kill-detail", () => ({
  useKillDetail: mocks.useKillDetail,
}));

vi.mock("./hooks/queries/use-matching-loots", () => ({
  useMatchingLoots: mocks.useMatchingLoots,
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => ({ data: null }),
}));

vi.mock("@/hooks/api/use-guild-permissions", () => ({
  useGuildPermissions: () => ({
    data: { allows: () => false, allowsAny: () => false },
  }),
}));

vi.mock("./components/dialogs/event-participation-confirmation-dialog", () => ({
  EventParticipationConfirmationDialog: () => null,
}));

vi.mock("./components/kills/kill-detail-summary", () => ({
  KillDetailSummary: ({
    kill,
    fasterThanMaxText,
  }: {
    kill: ReturnType<typeof createKill>;
    fasterThanMaxText: string | null;
  }) => (
    <div
      data-testid="kill-summary"
      data-faster-than-max={fasterThanMaxText ?? "none"}
    >
      {kill.heroNpc.npcName}:{String(kill.isManualClose)}
    </div>
  ),
}));

vi.mock("./components/kills/kill-participants-card", () => ({
  KillParticipantsCard: ({ participants }: { participants: unknown[] }) => (
    <div data-testid="participants-count">{participants.length}</div>
  ),
}));

vi.mock("./components/kills/kill-maps-timeline-section", () => ({
  KillMapsTimelineSection: () => <div>map-coverage</div>,
}));

vi.mock("./components/stats/multipliers-card", () => ({
  MultipliersCard: () => null,
}));

vi.mock(
  "@/features/guild/loots-list/components/loots-list/loots-list-item",
  () => ({ LootsListItem: () => <div>loot-item</div> }),
);

beforeEach(() => {
  mocks.useKillDetail.mockReturnValue({
    data: createDetailData(),
    isLoading: false,
    error: null,
  });
  mocks.useMatchingLoots.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("KillDetail states", () => {
  it("renders the compact loading state", () => {
    mocks.useKillDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<KillDetail />);

    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
    expect(container.firstElementChild?.className).toContain("px-3");
    expect(container.firstElementChild?.className).not.toContain("lg:px-4");
    expect(screen.queryByTestId("kill-summary")).toBeNull();
  });

  it("uses the same compact page padding as the member view", () => {
    const { container } = render(<KillDetail />);
    const main = container.querySelector("main");

    expect(main?.className).toContain("px-3");
    expect(main?.className).toContain("py-3");
    expect(main?.className).not.toContain("lg:px-4");
    expect(main?.className).not.toContain("lg:py-4");
  });

  it("renders the data error state with a route back to the hero", () => {
    mocks.useKillDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("failed"),
    });

    render(<KillDetail />);

    expect(screen.getByText("events.killDetail.notFound")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/hero");
  });

  it("renders empty participants and loot states", () => {
    render(<KillDetail />);

    expect(screen.getByTestId("participants-count").textContent).toBe("0");
    expect(screen.getByText("events.killDetail.noLoots")).toBeTruthy();
  });

  it("groups participants and maps separately from loots and scoring rules", () => {
    render(<KillDetail />);

    const contentGrid = screen.getByTestId("kill-detail-content-grid");
    const primaryColumn = screen.getByTestId("kill-detail-primary-column");
    const secondaryColumn = screen.getByTestId("kill-detail-secondary-column");

    expect(contentGrid.className).toContain("2xl:grid-cols");
    expect(primaryColumn.textContent).toContain("map-coverage");
    expect(primaryColumn.textContent).not.toContain(
      "events.killDetail.matchingLoots",
    );
    expect(secondaryColumn.textContent).toContain(
      "events.killDetail.matchingLoots",
    );
    expect(secondaryColumn.firstElementChild?.textContent).toContain(
      "events.killDetail.matchingLoots",
    );
  });

  it("passes manual close and long NPC names to the summary", () => {
    const longNpcName = "Nadzwyczajnie Długa Nazwa Potulnego Berserkera";
    mocks.useKillDetail.mockReturnValue({
      data: createDetailData({ isManualClose: true, npcName: longNpcName }),
      isLoading: false,
      error: null,
    });

    render(<KillDetail />);

    expect(screen.getByTestId("kill-summary").textContent).toBe(
      `${longNpcName}:true`,
    );
  });

  it("omits the early comparison when respawn equals the maximum", () => {
    mocks.useKillDetail.mockReturnValue({
      data: createDetailData({ respawnDurationSeconds: 7_200 }),
      isLoading: false,
      error: null,
    });

    render(<KillDetail />);

    expect(
      screen.getByTestId("kill-summary").getAttribute("data-faster-than-max"),
    ).toBe("none");
  });
});

function createDetailData(
  options: {
    isManualClose?: boolean;
    npcName?: string;
    respawnDurationSeconds?: number;
  } = {},
) {
  return {
    kill: createKill(options),
    eventConfig: {
      scoringMode: "ADVANCED",
      scoringRules: null,
    },
  };
}

function createKill(
  options: {
    isManualClose?: boolean;
    npcName?: string;
    respawnDurationSeconds?: number;
  } = {},
) {
  return {
    id: "kill-1",
    killedAt: "2026-08-12T09:18:12.000Z",
    minSpawnTimeAtKill: "2026-08-12T08:00:00.000Z",
    maxSpawnTimeAtKill: "2026-08-12T10:00:00.000Z",
    respawnDurationSeconds: options.respawnDurationSeconds ?? 4_692,
    windowDurationSeconds: 7_200,
    resolvedAfterMaxSpawnTimeMs: null,
    isManualClose: options.isManualClose ?? false,
    points: [],
    heroNpc: {
      npcId: 123,
      npcName: options.npcName ?? "Potulny Berserker",
      npcIcon: null,
      event: { world: "tempest" },
    },
  };
}
