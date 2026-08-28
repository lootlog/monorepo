// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardStatisticsFilters } from "./dashboard-statistics-filters";

vi.mock("@lootlog/ui/components/filter-popover", () => ({
  FilterPopover: ({
    options,
  }: {
    options: Array<{ label: string; value: string }>;
  }) => (
    <div data-testid="world-options">
      {options.map(({ label }) => label).join(",")}
    </div>
  ),
}));

vi.mock("@/features/kills/components/kill-stats-period-select", () => ({
  KillStatsPeriodSelect: ({ allLabel }: { allLabel?: string }) => (
    <button type="button">{allLabel}</button>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "kills.home.filters.allWorlds": "Wszystkie światy",
        "kills.playerStats.allPeriod": "Cały okres",
      };
      return translations[key] ?? key;
    },
  }),
}));

describe("DashboardStatisticsFilters", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps the selected world available before other options load", () => {
    render(
      <DashboardStatisticsFilters
        availableWorlds={[]}
        filters={{ npcType: "ELITE2", period: "all", world: "Lunia" }}
        onPeriodChange={vi.fn()}
        onWorldChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("world-options").textContent).toBe(
      "Wszystkie światy,Lunia",
    );
    expect(screen.getByRole("button", { name: "Cały okres" })).toBeTruthy();
  });
});
