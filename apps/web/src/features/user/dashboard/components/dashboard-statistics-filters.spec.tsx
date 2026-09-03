// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardStatisticsFilters } from "./dashboard-statistics-filters";

const mocks = vi.hoisted(() => ({
  useKillStats: vi.fn(),
}));

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getKillsControllerGetUserKillStatsQueryKey: () => ["kill-stats"],
  useKillsControllerGetUserKillStats: mocks.useKillStats,
}));

vi.mock("@/features/kills/components/kill-stats-period-select", () => ({
  KillStatsPeriodSelect: ({ allLabel }: { allLabel?: string }) => (
    <button type="button">{allLabel}</button>
  ),
}));

vi.mock("@/components/common/world-switcher", () => ({
  WorldSwitcher: ({ worlds }: { worlds: string[] }) => (
    <div data-testid="world-options">{worlds.join(",")}</div>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === "kills.playerStats.allPeriod" ? "Cały okres" : key,
  }),
}));

describe("DashboardStatisticsFilters", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps the selected world available before filter options load", () => {
    mocks.useKillStats.mockReturnValue({ data: undefined });

    render(
      <DashboardStatisticsFilters
        filters={{ npcType: "ELITE2", period: "all", world: "Lunia" }}
        onPeriodChange={vi.fn()}
        onWorldChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("world-options").textContent).toBe("Lunia");
    expect(screen.getByRole("button", { name: "Cały okres" })).toBeTruthy();
  });
});
