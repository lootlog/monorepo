import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import {
  getKillsControllerGetGuildKillStatsQueryKey,
  useKillsControllerGetGuildKillStats,
  type NpcType,
} from "@lootlog/client/main";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { KillStatsFilterBar } from "./components/kill-stats-filter-bar";
import { KillStatsOverview } from "./components/kill-stats-overview";
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
    setWorld,
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
    Boolean(settings.world) ||
    Boolean(settings.minLvl) ||
    Boolean(settings.maxLvl) ||
    settings.period !== "all";

  return (
    <ScrollArea className="h-full bg-background">
      <div className="flex flex-col gap-3 px-3 pb-3">
        <h1 className="sr-only">{t("common.stats.kills")}</h1>
        <KillStatsFilterBar
          world={settings.world}
          period={settings.period}
          onWorldChange={setWorld}
          onPeriodChange={setPeriod}
          level={{
            minLvl: settings.minLvl,
            maxLvl: settings.maxLvl,
            onMinLvlChange: setMinLvl,
            onMaxLvlChange: setMaxLvl,
          }}
        />

        <KillStatsOverview data={data?.overview} isLoading={isLoading} />

        <section
          aria-labelledby="kill-stats-leaders"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
            <h2 id="kill-stats-leaders" className="text-base font-semibold">
              {t("kills.leaders.title")}
            </h2>
            <AnimatedToggleGroup
              label={t("kills.filters.npcType")}
              value={npcType}
              onValueChange={setNpcType}
              options={TRACKABLE_NPC_TYPES.map((type) => ({
                value: type,
                label: t(`npcType.${type}`),
              }))}
            />
          </div>
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
      </div>
    </ScrollArea>
  );
};
