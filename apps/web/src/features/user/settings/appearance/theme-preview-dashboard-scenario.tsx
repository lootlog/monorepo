import type { UserKillStatsResponseDtoOutput } from "@lootlog/api-client/models/main/user-kill-stats-response-dto-output";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardStatisticsPanelView } from "@/features/user/dashboard/components/dashboard-statistics-panel-view";
import type { DashboardFilters } from "@/features/user/dashboard/hooks/use-dashboard-filters";
import { ThemePreviewReservationsCard } from "./theme-preview-reservations-card";
import type { ThemePreviewViewport } from "./theme-builder-preview-types";

interface ThemePreviewDashboardScenarioProps {
  viewport: ThemePreviewViewport;
}

export const ThemePreviewDashboardScenario = ({
  viewport,
}: ThemePreviewDashboardScenarioProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<DashboardFilters>({
    npcType: "ELITE2",
    period: "all",
    world: undefined,
  });
  const stats: UserKillStatsResponseDtoOutput = {
    overview: {
      killsByType: {
        COLOSSUS: 512,
        ELITE2: 14_515,
        ELITE3: 23,
        HERO: 272,
        TITAN: 38,
      },
      killsByWorld: {
        experimental: 15,
        gordion: 3_334,
        luvia: 12_011,
      },
      totalKills: 15_360,
    },
    topNpcs: [
      {
        npcIcon: "tyt/maddok_magua-1b.gif",
        npcId: 1,
        npcLvl: 284,
        npcName: t("settings.appearance.preview.dashboard.npcs.first"),
        npcProf: "b",
        npcType: "TITAN",
        totalKills: 975,
      },
      {
        npcIcon: "e2/wrzosera-1b.gif",
        npcId: 2,
        npcLvl: 267,
        npcName: t("settings.appearance.preview.dashboard.npcs.second"),
        npcProf: "m",
        npcType: "ELITE2",
        totalKills: 927,
      },
      {
        npcIcon: "e2/nymphemonia.gif",
        npcId: 3,
        npcLvl: 287,
        npcName: t("settings.appearance.preview.dashboard.npcs.third"),
        npcProf: "h",
        npcType: "ELITE2",
        totalKills: 920,
      },
      {
        npcIcon: "e2/chryzoprenia-1a.gif",
        npcId: 4,
        npcLvl: 260,
        npcName: t("settings.appearance.preview.dashboard.npcs.fourth"),
        npcProf: "t",
        npcType: "ELITE2",
        totalKills: 911,
      },
      {
        npcIcon: "e2/szkiel_set.gif",
        npcId: 5,
        npcLvl: 274,
        npcName: t("settings.appearance.preview.dashboard.npcs.fifth"),
        npcProf: "w",
        npcType: "ELITE2",
        totalKills: 882,
      },
    ],
  };
  const queryState = {
    data: stats,
    isError: false,
    isLoading: false,
    onRetry: () => undefined,
  };

  return (
    <div className="@container/dashboard p-3">
      <div className="grid items-start gap-4 @5xl/dashboard:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <DashboardStatisticsPanelView
          availableWorlds={["luvia", "gordion", "experimental"]}
          filters={filters}
          overview={queryState}
          ranking={queryState}
          onWorldChange={(world) =>
            setFilters((current) => ({ ...current, world }))
          }
          onPeriodChange={(period) =>
            setFilters((current) => ({ ...current, period }))
          }
          onNpcTypeChange={(npcType) =>
            setFilters((current) => ({ ...current, npcType }))
          }
          onViewAll={() => undefined}
        />
        <aside className={viewport === "mobile" ? "min-w-0" : undefined}>
          <ThemePreviewReservationsCard />
        </aside>
      </div>
    </div>
  );
};
