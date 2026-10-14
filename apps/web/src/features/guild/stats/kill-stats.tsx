import {
  getKillsControllerGetGuildKillStatsQueryKey,
  useKillsControllerGetGuildKillStats,
  type NpcType,
} from "@lootlog/client/main";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { KillStatsFilterBar } from "@/features/kills/components/kill-stats-filter-bar";
import { KillStatsActivity } from "./components/kill-stats-activity";
import { KillStatsOverview } from "./components/kill-stats-overview";
import { KillStatsRecords } from "./components/kill-stats-records";
import { KillStatsTimeline } from "./components/kill-stats-timeline";
import { MemberLeaderboardCard } from "./components/member-leaderboard-card";
import { TopNpcsCard } from "./components/top-npcs-card";
import { TRACKABLE_NPC_TYPES } from "./constants";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { buildGuildKillStatsParams } from "./utils/build-stats-query-params";

const NPC_TYPE_STORAGE_KEY = "stats-top-npcs-type";

export const KillStats = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ from: "/_authenticated/$guildId" });

  const [storedNpcType, setNpcType] = useLocalStorage<NpcType>(
    NPC_TYPE_STORAGE_KEY,
    "ELITE2",
  );

  const npcType = TRACKABLE_NPC_TYPES.includes(storedNpcType)
    ? storedNpcType
    : "ELITE2";

  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setMinLvl,
    setMaxLvl,
    setPeriod,
  } = useStatsSettings("overview");

  const killStatsParams = buildGuildKillStatsParams({
    world: settings.world ?? undefined,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
    period: settings.period,
  });

  const { data, isLoading } = useKillsControllerGetGuildKillStats(
    { guildId },
    killStatsParams,
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getKillsControllerGetGuildKillStatsQueryKey(
          { guildId },
          killStatsParams,
        ),
      },
    },
  );

  const hasActiveFilters =
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all";

  return (
    <div className="flex flex-col gap-3 p-3">
      <h1 className="sr-only">{t("common.stats.kills")}</h1>
      <KillStatsFilterBar
        period={settings.period}
        onPeriodChange={setPeriod}
        level={{
          minLvl: settings.minLvl,
          maxLvl: settings.maxLvl,
          onMinLvlChange: setMinLvl,
          onMaxLvlChange: setMaxLvl,
        }}
      />

      <KillStatsOverview
        data={data?.overview}
        isLoading={isLoading}
        selectedType={npcType}
        onSelectType={setNpcType}
      />

      <section
        aria-labelledby="kill-stats-leaders"
        className="flex flex-col gap-3"
      >
        <h2 id="kill-stats-leaders" className="sr-only">
          {t("kills.leaders.titleWithType", {
            type: t(`npcType.${npcType}`),
          })}
        </h2>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
            minLvl={debouncedMinLvl}
            maxLvl={debouncedMaxLvl}
            period={settings.period}
          />
        </div>
      </section>

      <KillStatsTimeline data={data?.timeline} isLoading={isLoading} />

      {/* An API from before the timeline omits it during a rollout. */}
      {data?.timeline && data.hourlyWeekday?.length > 0 && (
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-3">
          <KillStatsRecords data={data} />
          <KillStatsActivity
            cells={data.hourlyWeekday}
            className="min-w-0 xl:col-span-2"
          />
        </div>
      )}
    </div>
  );
};
