// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerKillStatsPanel } from "./player-kill-stats-panel";
import { TopKilledNpcsPanel } from "./top-killed-npcs-panel";

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
}));

vi.mock("@lootlog/ui/components/filter-popover", () => ({
  FilterPopover: ({ value }: { value: string }) => (
    <button type="button">{value}</button>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: string }) => {
      const translations: Record<string, string> = {
        "kills.filters.npcType": "Typ NPC",
        "kills.home.topKilledNpcs.filteredNoData": "Brak dopasowań",
        "kills.home.topKilledNpcs.killCount": `x${options?.count ?? ""}`,
        "kills.home.topKilledNpcs.loadError":
          "Nie udało się wczytać rankingu potworów.",
        "kills.home.topKilledNpcs.noData": "Brak potworów",
        "kills.home.topKilledNpcs.title": "Najczęściej bite potwory",
        "kills.home.topKilledNpcs.viewAll": "Zobacz pełny ranking",
        "kills.overview.killsByType": "Bicia według typu",
        "kills.overview.title": "Podsumowanie",
        "kills.overview.totalKills": "Łączne bicia",
        "kills.playerStats.filteredNoData": "Brak bić dla filtrów",
        "kills.playerStats.killsByWorld": "Bicia według świata",
        "kills.playerStats.loadError":
          "Nie udało się wczytać podsumowania bić.",
        "kills.playerStats.noData": "Brak danych o biciach",
        "common.actions.retry": "Spróbuj ponownie",
        "npcType.ELITE2": "Elita II",
        "npcType.HERO": "Heros",
        "npcType.TITAN": "Tytan",
      };

      return translations[key] ?? key;
    },
  }),
}));

const populatedStats = {
  overview: {
    killsByType: {
      COMMON: 0,
      COLOSSUS: 0,
      ELITE: 0,
      ELITE2: 10,
      ELITE3: 0,
      HERO: 5,
      TITAN: 2,
    },
    killsByWorld: {
      experimental: 1,
      gordion: 20,
      hutena: 4,
      katahha: 3,
      lunia: 30,
      zemyna: 2,
    },
    totalKills: 17,
  },
  topNpcs: [],
};

const populatedRanking = {
  ...populatedStats,
  topNpcs: [
    {
      npcIcon: null,
      npcId: 1,
      npcLvl: 300,
      npcName:
        "Bardzo długa nazwa przeciwnika, która nie może rozsadzić panelu rankingu",
      npcProf: "w",
      npcType: "ELITE2",
      totalKills: 1234,
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      npcIcon: null,
      npcId: index + 2,
      npcLvl: 299 - index,
      npcName: index === 4 ? "Szósty potwór" : `Potwór ${index + 2}`,
      npcProf: "m",
      npcType: "ELITE2",
      totalKills: 1000 - index,
    })),
  ],
};

describe("dashboard statistics data panels", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("exposes the selected NPC type inside the query-free ranking view", () => {
    render(
      <>
        <PlayerKillStatsPanel
          data={populatedStats}
          hasActiveFilters
          isError={false}
          isLoading={false}
          onRetry={mocks.refetch}
        />
        <TopKilledNpcsPanel
          data={populatedRanking}
          hasActiveFilters
          isError={false}
          isLoading={false}
          npcType="HERO"
          onNpcTypeChange={vi.fn()}
          onRetry={mocks.refetch}
          onViewAll={vi.fn()}
        />
      </>,
    );

    const ranking = screen.getByRole("region", {
      name: "Najczęściej bite potwory",
    });
    expect(
      within(ranking).getByRole("group", { name: "Typ NPC" }),
    ).toBeTruthy();
  });

  it("keeps long names contained and renders direct counts without charts", () => {
    render(
      <>
        <PlayerKillStatsPanel
          data={populatedStats}
          hasActiveFilters={false}
          isError={false}
          isLoading={false}
          onRetry={mocks.refetch}
        />
        <TopKilledNpcsPanel
          data={populatedRanking}
          hasActiveFilters={false}
          isError={false}
          isLoading={false}
          npcType="ELITE2"
          onNpcTypeChange={vi.fn()}
          onRetry={mocks.refetch}
          onViewAll={vi.fn()}
        />
      </>,
    );

    const longName = screen.getByText(
      "Bardzo długa nazwa przeciwnika, która nie może rozsadzić panelu rankingu",
    );
    expect(longName.className).toContain("truncate");
    expect(longName.closest("li")?.querySelector("img")).toBeNull();
    const ranking = screen.getByRole("region", {
      name: "Najczęściej bite potwory",
    });
    expect(within(ranking).getAllByRole("listitem")).toHaveLength(5);
    expect(within(ranking).queryByText("Szósty potwór")).toBeNull();
    expect(
      screen.queryByRole("img", {
        name: "Rozkład bić według typu przeciwnika",
      }),
    ).toBeNull();
    expect(screen.queryByText("Najczęstszy typ")).toBeNull();
    expect(screen.getByText("17")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("Lunia")).toBeTruthy();
    expect(screen.getByText("Zemyna")).toBeTruthy();
    expect(screen.queryByText("Experimental")).toBeNull();
  });

  it("groups ordered type and world summaries into named compact sections", () => {
    render(
      <PlayerKillStatsPanel
        data={populatedStats}
        hasActiveFilters={false}
        isError={false}
        isLoading={false}
        onRetry={mocks.refetch}
      />,
    );

    const overview = screen.getByRole("region", { name: "Podsumowanie" });
    const typeSummary = within(overview).getByRole("region", {
      name: "Bicia według typu",
    });
    const worldSummary = within(overview).getByRole("region", {
      name: "Bicia według świata",
    });

    expect(
      within(typeSummary)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Tytan2", "Heros5", "Elita II10"]);
    expect(
      within(worldSummary)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Lunia30", "Gordion20", "Hutena4", "Katahha3", "Zemyna2"]);
  });

  it("exposes loading and filtered empty states", () => {
    const { rerender } = render(
      <PlayerKillStatsPanel
        hasActiveFilters
        isError={false}
        isLoading
        onRetry={mocks.refetch}
      />,
    );

    expect(
      screen
        .getByRole("region", { name: "Podsumowanie" })
        .getAttribute("aria-busy"),
    ).toBe("true");

    rerender(
      <PlayerKillStatsPanel
        data={{
          overview: {
            killsByType: {},
            killsByWorld: {},
            totalKills: 0,
          },
          topNpcs: [],
        }}
        hasActiveFilters
        isError={false}
        isLoading={false}
        onRetry={mocks.refetch}
      />,
    );

    expect(screen.getByText("Brak bić dla filtrów")).toBeTruthy();
  });

  it("distinguishes query failures from empty data and lets the user retry", () => {
    render(
      <>
        <PlayerKillStatsPanel
          hasActiveFilters={false}
          isError
          isLoading={false}
          onRetry={mocks.refetch}
        />
        <TopKilledNpcsPanel
          hasActiveFilters={false}
          isError
          isLoading={false}
          npcType="ELITE2"
          onNpcTypeChange={vi.fn()}
          onRetry={mocks.refetch}
          onViewAll={vi.fn()}
        />
      </>,
    );

    expect(
      screen.getByText("Nie udało się wczytać podsumowania bić."),
    ).toBeTruthy();
    expect(
      screen.getByText("Nie udało się wczytać rankingu potworów."),
    ).toBeTruthy();

    for (const retryButton of screen.getAllByRole("button", {
      name: "Spróbuj ponownie",
    })) {
      fireEvent.click(retryButton);
    }

    expect(mocks.refetch).toHaveBeenCalledTimes(2);
  });
});
