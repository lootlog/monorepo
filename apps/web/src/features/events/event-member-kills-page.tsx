import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "@tanstack/react-router";
import { differenceInSeconds } from "date-fns";
import { AlertCircle, Clock, Loader2, Skull, Swords } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import { NpcTile } from "@/components/tiles";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventRanking } from "./hooks/queries/use-event-ranking";
import {
  type EventMemberKill,
  useEventMemberKillHistory,
} from "./hooks/queries/use-event-member-kill-history";
import { useEventSocket } from "./hooks/socket/use-event-socket";
import {
  formatDateTime,
  formatDurationHuman,
  formatMapNamesFromMapData,
} from "./utils";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";

const formatPoints = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

const formatPercentage = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  const normalized = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, "");
  return `${normalized}%`;
};

type MemberStatsSummary = {
  totalKills: number;
  totalPoints: number;
  totalTimeSeconds: number;
  avgAfkPercentage: number;
  avgPointsPerKill: number;
  avgTimePerKillSeconds: number;
};

type HeroSummaryCard = {
  heroId: string;
  npcId: number | null;
  npcName: string;
  npcIcon: string | null;
  totalKills: number;
  totalPoints: number;
  totalTimeSeconds: number;
  avgAfkPercentage: number;
  avgPointsPerKill: number;
  avgTimePerKillSeconds: number;
};

const buildStatsSummary = (
  rankings: Array<{
    totalKills: number;
    totalPoints: number;
    totalTimeSeconds: number;
    avgAfkPercentage: number;
  }>,
): MemberStatsSummary => {
  const totalKills = rankings.reduce(
    (sum, ranking) => sum + ranking.totalKills,
    0,
  );
  const totalPoints = rankings.reduce(
    (sum, ranking) => sum + ranking.totalPoints,
    0,
  );
  const totalTimeSeconds = rankings.reduce(
    (sum, ranking) => sum + ranking.totalTimeSeconds,
    0,
  );
  const weightedAfkSum = rankings.reduce(
    (sum, ranking) => sum + ranking.avgAfkPercentage * ranking.totalKills,
    0,
  );
  const avgAfkPercentage = totalKills > 0 ? weightedAfkSum / totalKills : 0;
  const avgPointsPerKill = totalKills > 0 ? totalPoints / totalKills : 0;
  const avgTimePerKillSeconds =
    totalKills > 0 ? totalTimeSeconds / totalKills : 0;

  return {
    totalKills,
    totalPoints,
    totalTimeSeconds,
    avgAfkPercentage,
    avgPointsPerKill,
    avgTimePerKillSeconds,
  };
};

const StatPill = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "primary" | "warning";
}) => {
  const toneClass =
    tone === "primary"
      ? "bg-primary/12 text-primary border-primary/30"
      : tone === "warning"
        ? "bg-amber-500/12 text-amber-400 border-amber-500/30"
        : "bg-muted/50 text-muted-foreground border-border/70";

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] leading-none ${toneClass}`}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
};

const MemberKillCard = ({
  kill,
  guildId,
  eventId,
}: {
  kill: EventMemberKill;
  guildId: string;
  eventId: string;
}) => {
  const { t } = useTranslation();
  const point = kill.memberPoint;
  const basePoints = point?.basePoints ?? 0;
  const bonusPoints =
    Math.round(Math.max(0, (point?.points ?? 0) - basePoints) * 100) / 100;
  const totalPoints = point?.points ?? 0;
  const uncappedTotal = basePoints + bonusPoints;
  const hasManualAdjustment = Math.abs(uncappedTotal - totalPoints) > 0.0001;
  const trackingDurationPercentage =
    typeof point?.trackingDurationPercentage === "number"
      ? `${Math.round(point.trackingDurationPercentage)}%`
      : "—";
  const trackingDurationSeconds = point?.trackingDurationSeconds;
  const trackingDurationTime =
    typeof trackingDurationSeconds === "number" && trackingDurationSeconds >= 0
      ? formatDurationHuman(trackingDurationSeconds)
      : "—";
  const mapNames = formatMapNamesFromMapData(point?.mapData);

  const respawnDuration =
    kill.isManualClose === true
      ? null
      : formatDurationHuman(
          Math.max(
            0,
            differenceInSeconds(
              new Date(kill.killedAt),
              new Date(kill.minSpawnTimeAtKill),
            ),
          ),
        );
  const breakdownPills = [
    {
      label: t("events.kills.breakdownBase"),
      value: formatPoints(basePoints),
      tone: "neutral" as const,
    },
    {
      label: t("events.kills.breakdownBonus", "Bonus"),
      value: formatPoints(bonusPoints),
      tone: bonusPoints > 0 ? ("primary" as const) : ("neutral" as const),
    },
  ];

  return (
    <Link
      to="/$guildId/events/$eventId/heroes/$heroId/kills/$killId"
      params={{
        guildId,
        eventId,
        heroId: kill.heroNpcId,
        killId: kill.id,
      }}
      className="block"
    >
      <div className="p-3 rounded-xl border border-border/70 bg-card/40 hover:bg-card/60 hover:border-primary/35 transition-colors shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {kill.heroNpc.npcIcon ? (
              <NpcTile
                npc={{
                  id: kill.heroNpc.npcId ?? undefined,
                  name: kill.heroNpc.npcName,
                  icon: kill.heroNpc.npcIcon,
                }}
              />
            ) : (
              <Skull className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {kill.heroNpc.npcName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(new Date(kill.killedAt))}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-primary leading-none">
              {formatPoints(totalPoints)}
              <span className="text-xs font-medium ml-1">pkt</span>
            </p>
            {respawnDuration && (
              <p className="text-[11px] mt-1 text-muted-foreground flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />
                {respawnDuration}
              </p>
            )}
            <p className="text-[11px] mt-1 text-muted-foreground">
              {t("events.kills.trackingDurationTime")}: {trackingDurationTime}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatPill
            label={t("events.kills.trackingCoverageShort")}
            value={trackingDurationPercentage}
          />
          {kill.isManualClose && (
            <StatPill
              label={t("events.kills.manualCloseShort")}
              value={t("events.kills.manualCloseLabel")}
              tone="warning"
            />
          )}
        </div>

        <div className="mt-2 space-y-1.5">
          {point ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {breakdownPills.map((pill) => (
                  <StatPill
                    key={pill.label}
                    label={pill.label}
                    value={pill.value}
                    tone={pill.tone}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {mapNames}
              </p>
              {hasManualAdjustment && (
                <p className="text-xs text-amber-500">
                  {t("events.kills.manualAdjustment", {
                    uncapped: formatPoints(uncappedTotal),
                    total: formatPoints(totalPoints),
                  })}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("events.kills.pointBreakdownUnavailable")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export const EventMemberKillsPage = () => {
  const { t } = useTranslation();
  const {
    guildId,
    eventId,
    memberId,
    heroId: urlHeroId,
  } = useParams({
    strict: false,
  });
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    urlHeroId,
  );

  useEffect(() => {
    setSelectedHeroId(urlHeroId);
  }, [urlHeroId]);

  const {
    data: event,
    isLoading: eventLoading,
    error: eventError,
  } = useEventOverview({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const {
    data: killsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: killsLoading,
    error: killsError,
  } = useEventMemberKillHistory({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    memberId: memberId ?? "",
    heroId: selectedHeroId,
    limit: 20,
  });
  const { data: rankings = [] } = useEventRanking({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  useEventSocket({
    guildId,
    eventId,
    heroId: selectedHeroId,
  });

  const heroes = event?.heroNpcs ?? [];
  const allKills = killsData?.pages.flatMap((page) => page.data) ?? [];
  const member = killsData?.pages[0]?.member;
  const memberIdNumber = Number.parseInt(memberId ?? "", 10);
  const selectedHero = selectedHeroId
    ? heroes.find((hero) => hero.id === selectedHeroId)
    : undefined;
  const memberRankings = useMemo(
    () =>
      Number.isNaN(memberIdNumber)
        ? []
        : rankings.filter((ranking) => ranking.memberId === memberIdNumber),
    [memberIdNumber, rankings],
  );
  const heroSummaries = useMemo<HeroSummaryCard[]>(() => {
    if (selectedHero) {
      const ranking = memberRankings.find(
        (entry) => entry.heroNpcName === selectedHero.npcName,
      );
      const stats = buildStatsSummary(
        ranking
          ? [
              {
                totalKills: ranking.totalKills,
                totalPoints: ranking.totalPoints,
                totalTimeSeconds: ranking.totalTimeSeconds,
                avgAfkPercentage: ranking.avgAfkPercentage,
              },
            ]
          : [],
      );

      return [
        {
          heroId: selectedHero.id,
          npcId: selectedHero.npcId ?? null,
          npcName: selectedHero.npcName,
          npcIcon: selectedHero.npcIcon,
          totalKills: stats.totalKills,
          totalPoints: stats.totalPoints,
          totalTimeSeconds: stats.totalTimeSeconds,
          avgAfkPercentage: stats.avgAfkPercentage,
          avgPointsPerKill: stats.avgPointsPerKill,
          avgTimePerKillSeconds: stats.avgTimePerKillSeconds,
        },
      ];
    }

    return memberRankings
      .filter((entry) => entry.totalKills > 0)
      .map((entry) => {
        const hero = heroes.find(
          (candidate) => candidate.npcName === entry.heroNpcName,
        );
        const stats = buildStatsSummary([
          {
            totalKills: entry.totalKills,
            totalPoints: entry.totalPoints,
            totalTimeSeconds: entry.totalTimeSeconds,
            avgAfkPercentage: entry.avgAfkPercentage,
          },
        ]);
        return {
          heroId: hero?.id ?? `rank-${entry.id}`,
          npcId: hero?.npcId ?? null,
          npcName: entry.heroNpcName,
          npcIcon: hero?.npcIcon ?? null,
          totalKills: stats.totalKills,
          totalPoints: stats.totalPoints,
          totalTimeSeconds: stats.totalTimeSeconds,
          avgAfkPercentage: stats.avgAfkPercentage,
          avgPointsPerKill: stats.avgPointsPerKill,
          avgTimePerKillSeconds: stats.avgTimePerKillSeconds,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [heroes, memberRankings, selectedHero]);
  const heroTabs = heroes;
  const contextStats = useMemo(() => {
    if (selectedHero) {
      const ranking = memberRankings.find(
        (entry) => entry.heroNpcName === selectedHero.npcName,
      );

      return buildStatsSummary(
        ranking
          ? [
              {
                totalKills: ranking.totalKills,
                totalPoints: ranking.totalPoints,
                totalTimeSeconds: ranking.totalTimeSeconds,
                avgAfkPercentage: ranking.avgAfkPercentage,
              },
            ]
          : [],
      );
    }

    return buildStatsSummary(
      memberRankings.map((entry) => ({
        totalKills: entry.totalKills,
        totalPoints: entry.totalPoints,
        totalTimeSeconds: entry.totalTimeSeconds,
        avgAfkPercentage: entry.avgAfkPercentage,
      })),
    );
  }, [memberRankings, selectedHero]);

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.error", "Nie znaleziono eventu")}
        </p>
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-2 gap-3">
        <Avatar className="h-8 w-8">
          {member && (
            <AvatarImage
              src={getDiscordAvatarUrl(member.userId, member.avatar, 64)}
            />
          )}
          <AvatarFallback>
            {member?.name?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="text-xs font-semibold leading-tight">
            {t("events.kills.memberHistoryTitle")}
          </h2>
          <p className="text-[11px] text-muted-foreground leading-tight truncate">
            {member?.name ?? `#${memberId}`} •{" "}
            {selectedHero ? `${selectedHero.npcName} • ` : ""}
            {event.name}
          </p>
        </div>
      </div>

      <div className="px-3 py-2 bg-background border-b">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
          {t("events.kills.memberStatsTitle")}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">
              {t("events.kills.kpiKills")}
            </p>
            <p className="text-sm font-semibold">{contextStats.totalKills}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">
              {t("events.kills.kpiPoints")}
            </p>
            <p className="text-sm font-semibold text-primary">
              {formatPoints(contextStats.totalPoints)}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">
              {t("events.kills.kpiTotalTime")}
            </p>
            <p className="text-sm font-semibold">
              {formatDurationHuman(contextStats.totalTimeSeconds)}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">
              {t("events.kills.kpiAvgAfk")}
            </p>
            <p className="text-sm font-semibold">
              {formatPercentage(contextStats.avgAfkPercentage)}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">
              {t("events.kills.kpiAvgPointsPerKill")}
            </p>
            <p className="text-sm font-semibold">
              {formatPoints(contextStats.avgPointsPerKill)}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">
              {t("events.kills.kpiAvgTimePerKill")}
            </p>
            <p className="text-sm font-semibold">
              {formatDurationHuman(
                Math.round(contextStats.avgTimePerKillSeconds),
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 bg-background border-b">
        {heroSummaries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("events.kills.noHeroSummary")}
          </p>
        ) : (
          <div className="space-y-2">
            {heroSummaries.map((summaryEntry) => (
              <div
                key={summaryEntry.heroId}
                className="rounded-xl border border-border/70 bg-gradient-to-r from-card/70 via-card/50 to-card/30 px-3 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {summaryEntry.npcIcon ? (
                    <NpcTile
                      npc={{
                        id: summaryEntry.npcId ?? undefined,
                        name: summaryEntry.npcName,
                        icon: summaryEntry.npcIcon,
                      }}
                    />
                  ) : (
                    <Skull className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <p className="text-sm font-semibold truncate">
                    {summaryEntry.npcName}
                  </p>
                </div>

                <div className="shrink-0 flex flex-wrap justify-end gap-1.5 max-w-[60%]">
                  <StatPill
                    label={t("events.kills.summaryKills")}
                    value={summaryEntry.totalKills}
                  />
                  <StatPill
                    label={t("events.kills.summaryPoints")}
                    value={formatPoints(summaryEntry.totalPoints)}
                    tone="primary"
                  />
                  <StatPill
                    label={t("events.kills.summaryTime")}
                    value={formatDurationHuman(summaryEntry.totalTimeSeconds)}
                  />
                  <StatPill
                    label={t("events.kills.summaryAvgAfk")}
                    value={formatPercentage(summaryEntry.avgAfkPercentage)}
                    tone="warning"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {heroes.length > 0 && (
        <div className="px-3 py-2 bg-background shrink-0 border-b">
          <Tabs
            value={selectedHeroId ?? "all"}
            onValueChange={(value) =>
              setSelectedHeroId(value === "all" ? undefined : value)
            }
          >
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="flex-shrink-0 text-xs">
                {t("events.kills.allHeroes")}
              </TabsTrigger>
              {heroTabs.map((hero) => (
                <TabsTrigger
                  key={hero.id}
                  value={hero.id}
                  className="flex-shrink-0 text-xs"
                >
                  <Swords className="w-3 h-3 mr-1" />
                  {hero.npcName}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {killsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : killsError ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertCircle className="w-6 h-6 text-destructive" />
          <p className="text-xs">{t("events.kills.loading")}</p>
        </div>
      ) : allKills.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Skull className="w-6 h-6 mb-2 opacity-50" />
          <p className="text-xs">{t("events.kills.noKills")}</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 py-2 space-y-2 flex flex-col">
            {allKills.map((kill) => (
              <MemberKillCard
                key={kill.id}
                kill={kill}
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
              />
            ))}

            <div className="py-2 flex items-center justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs">{t("events.kills.loading")}</span>
                </div>
              ) : hasNextPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-xs h-7"
                >
                  {t("events.kills.loadMore")}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("events.kills.endOfList")}
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
