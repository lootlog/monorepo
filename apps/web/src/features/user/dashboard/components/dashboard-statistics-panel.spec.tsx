// @vitest-environment happy-dom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardStatisticsPanel } from "./dashboard-statistics-panel";

const mocks = vi.hoisted(() => ({
  updateFilters: vi.fn(),
  useKillStats: vi.fn(),
}));

vi.mock("@lootlog/api-client/react-query/main/kills", () => ({
  getKillsControllerGetUserKillStatsQueryKey: (params?: unknown) => [
    "kill-stats",
    params,
  ],
  useKillsControllerGetUserKillStats: mocks.useKillStats,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "kills.playerStats.title": "Twoje statystyki bić",
        "kills.playerStats.dashboardDescription":
          "Podsumowanie bić według okresu, świata i przeciwników",
        "kills.playerStats.filtersLabel": "Filtry statystyk bić",
        "kills.playerStats.sectionsLabel": "Widok statystyk bić",
        "kills.playerStats.summarySection": "Podsumowanie",
        "kills.playerStats.monstersSection": "Potwory",
        "kills.overview.totalKills": "Łączne bicia",
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock("../hooks/use-dashboard-filters", () => ({
  useDashboardFilters: () => ({
    filters: {
      npcType: "HERO",
      period: "7d",
      world: "Lunia",
    },
    updateFilters: mocks.updateFilters,
  }),
}));

vi.mock("./dashboard-statistics-filters", () => ({
  DashboardStatisticsFilters: () => (
    <div role="group" aria-label="Filtry statystyk bić">
      <button type="button">Okres</button>
      <button type="button">Świat</button>
    </div>
  ),
}));

vi.mock("./player-kill-stats-panel", () => ({
  PlayerKillStatsPanel: ({
    data,
    hasActiveFilters,
  }: {
    data?: { overview: { totalKills: number } };
    hasActiveFilters: boolean;
  }) => (
    <section
      aria-label="Podsumowanie"
      data-has-active-filters={hasActiveFilters}
      data-total-kills={data?.overview.totalKills}
    />
  ),
}));

vi.mock("./top-killed-npcs-panel", () => ({
  TopKilledNpcsPanel: ({
    data,
    npcType,
  }: {
    data?: { topNpcs: unknown[] };
    npcType: string;
  }) => (
    <section
      aria-label="Najczęściej bite potwory"
      data-count={data?.topNpcs.length}
      data-npc-type={npcType}
    />
  ),
}));

describe("DashboardStatisticsPanel", () => {
  beforeEach(() => {
    mocks.useKillStats.mockReturnValue({
      data: {
        overview: {
          killsByType: {},
          killsByWorld: {},
          totalKills: 14_459,
        },
        topNpcs: [],
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("scopes shared filters and both data sections to one statistics region", () => {
    render(<DashboardStatisticsPanel />);

    const statistics = screen.getByRole("region", {
      name: "Twoje statystyki bić",
    });

    expect(
      within(statistics).getByRole("group", {
        name: "Filtry statystyk bić",
      }),
    ).toBeTruthy();

    const overview = within(statistics).getByRole("region", {
      name: "Podsumowanie",
    });
    expect(overview.dataset.hasActiveFilters).toBe("true");
    expect(overview.dataset.totalKills).toBe("14459");
    expect(mocks.useKillStats).toHaveBeenCalledWith(
      { period: "7d", world: "Lunia" },
      expect.any(Object),
    );

    const ranking = within(statistics).getByRole("region", {
      name: "Najczęściej bite potwory",
    });
    expect(ranking.dataset.npcType).toBe("HERO");
    expect(mocks.useKillStats).toHaveBeenCalledWith(
      { npcTypes: ["HERO"], period: "7d", world: "Lunia" },
      expect.any(Object),
    );
  });

  it("renders both data sections as separate cards without a compact switcher", () => {
    render(<DashboardStatisticsPanel />);

    const statistics = screen.getByRole("region", {
      name: "Twoje statystyki bić",
    });
    const summary = within(statistics).getByRole("region", {
      name: "Podsumowanie",
    });
    const monsters = within(statistics).getByRole("region", {
      name: "Najczęściej bite potwory",
    });

    expect(statistics.querySelectorAll("[data-statistics-card]")).toHaveLength(
      2,
    );
    expect(
      summary
        .closest("[data-statistics-card]")
        ?.getAttribute("data-statistics-card"),
    ).toBe("summary");
    expect(
      monsters
        .closest("[data-statistics-card]")
        ?.getAttribute("data-statistics-card"),
    ).toBe("monsters");
    expect(
      within(statistics).queryByRole("group", {
        name: "Widok statystyk bić",
      }),
    ).toBeNull();
  });
});
