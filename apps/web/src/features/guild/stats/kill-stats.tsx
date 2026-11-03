import type { KilledNpcType } from "@/constants/npc";
import { countActiveKillStatsFilters } from "@/features/kills/components/count-active-kill-stats-filters";
import { useKillsControllerGetGuildKillStats } from "@lootlog/client/main";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { FilterBar } from "@/components/common/filter-bar";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";
import {
  KillStatsFilters,
  type KillStatsFiltersProps,
} from "@/features/kills/components/kill-stats-filters";
import { KillStatsStackedFilters } from "@/features/kills/components/kill-stats-stacked-filters";
import { KillStatsActivity } from "@/components/common/kill-analytics/kill-stats-activity";
import { KillStatsOverview } from "@/components/common/kill-analytics/kill-stats-overview";
import { KillStatsRecords } from "./components/kill-stats-records";
import { KillStatsTimeline } from "./components/kill-stats-timeline";
import { MemberLeaderboardCard } from "./components/member-leaderboard-card";
import { TopNpcsCard } from "./components/top-npcs-card";
import { TRACKABLE_NPC_TYPES } from "./constants";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { buildGuildKillStatsParams } from "./utils/build-stats-query-params";
import { formatNumber } from "@/lib/format-number";
import { parseKillStatsLevel } from "@/features/kills/parse-kill-stats-level";

const NPC_TYPE_STORAGE_KEY = "stats-top-npcs-type";

export const KillStats = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ from: "/_authenticated/$guildId" });

  const [storedNpcType, setNpcType] = useLocalStorage<KilledNpcType>(
    NPC_TYPE_STORAGE_KEY,
    "ELITE2",
  );

  const npcType = TRACKABLE_NPC_TYPES.includes(storedNpcType)
    ? storedNpcType
    : "ELITE2";

  const {
    settings,
    hasActiveFilters,
    setMinLvl,
    setMaxLvl,
    setPeriod,
    resetFilters,
  } = useStatsSettings();

  const killStatsParams = buildGuildKillStatsParams(settings);

  const { data, isLoading } = useKillsControllerGetGuildKillStats(
    { guildId },
    killStatsParams,
    {
      query: {
        enabled: Boolean(guildId),
      },
    },
  );

  const filterProps: KillStatsFiltersProps = {
    period: settings.period,
    onPeriodChange: setPeriod,
    level: {
      minLvl: settings.minLvl,
      maxLvl: settings.maxLvl,
      onMinLvlChange: setMinLvl,
      onMaxLvlChange: setMaxLvl,
    },
  };

  return (
    <div>
      <h1 className="sr-only">{t("common.stats.kills")}</h1>
      <FilterBar
        ariaLabel={t("kills.filters.title")}
        stackedFilters={<KillStatsStackedFilters {...filterProps} />}
        activeFilterCount={countActiveKillStatsFilters(filterProps)}
        clearFiltersLabel={t("kills.filters.clear")}
        onClearFilters={resetFilters}
      >
        <KillStatsFilters {...filterProps} />
      </FilterBar>
      <KillStatsOverview
        total={data?.overview.guildUniqueKills}
        totalDetail={t("kills.overview.participations", {
          value: formatNumber(data?.overview.totalMemberParticipations ?? 0),
        })}
        types={TRACKABLE_NPC_TYPES.map((type) => ({
          type,
          kills: data?.overview.killsByType[type] ?? 0,
          detail: t("kills.overview.participations", {
            value: formatNumber(data?.overview.participationsByType[type] ?? 0),
          }),
        }))}
        isLoading={isLoading}
        selectedType={npcType}
        onSelectType={setNpcType}
      />

      <StatsSectionColumns className="xl:grid-cols-2">
        <MemberLeaderboardCard
          data={data?.memberRanking}
          npcType={npcType}
          isLoading={isLoading}
          guildId={guildId}
          hasActiveFilters={hasActiveFilters}
        />
        <TopNpcsCard
          guildId={guildId}
          npcType={npcType}
          world={settings.world ?? undefined}
          minLvl={parseKillStatsLevel(settings.minLvl)}
          maxLvl={parseKillStatsLevel(settings.maxLvl)}
          period={settings.period}
        />
      </StatsSectionColumns>

      <KillStatsTimeline data={data?.timeline} isLoading={isLoading} />

      {/* An API from before the timeline omits it during a rollout. */}
      {data?.timeline && data.hourlyWeekday?.length > 0 && (
        <>
          <KillStatsRecords data={data} />
          <KillStatsActivity cells={data.hourlyWeekday} />
        </>
      )}
    </div>
  );
};
