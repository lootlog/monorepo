import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { differenceInSeconds } from "date-fns";
import { AlertCircle, BarChart3, Clock, Skull, Swords } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { NpcTile } from "@/components/tiles";
import {
  useResetScrollTop,
  useVirtualInfiniteScroll,
} from "@/hooks/utils/use-virtual-infinite-scroll";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventScrollableTabsList } from "./components/shared/event-scrollable-tabs-list";
import {
  type EventMemberKill,
  useEventMemberKillHistory,
} from "./hooks/queries/use-event-member-kill-history";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventRanking } from "./hooks/queries/use-event-ranking";
import type { EventHeroNpc, EventRanking } from "./hooks/queries/use-events";
import {
  formatDateTime,
  formatDurationHuman,
  normalizeBonusBreakdown,
} from "./utils";

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

type RankingSummaryInput = Pick<
  EventRanking,
  "totalKills" | "totalPoints" | "totalTimeSeconds" | "avgAfkPercentage"
>;

type MemberIdentity = {
  avatar?: string | null;
  name: string;
  userId: string;
};

const buildStatsSummary = (
  rankings: RankingSummaryInput[],
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

const buildHeroSummaries = ({
  heroes,
  memberRankings,
  selectedHero,
}: {
  heroes: EventHeroNpc[];
  memberRankings: EventRanking[];
  selectedHero?: EventHeroNpc;
}): HeroSummaryCard[] => {
  if (selectedHero) {
    const ranking = memberRankings.find(
      (entry) => entry.heroNpcName === selectedHero.npcName,
    );
    const stats = buildStatsSummary(ranking ? [ranking] : []);

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
      const stats = buildStatsSummary([entry]);

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
    .sort((left, right) => right.totalPoints - left.totalPoints);
};

const buildContextStats = ({
  memberRankings,
  selectedHero,
}: {
  memberRankings: EventRanking[];
  selectedHero?: EventHeroNpc;
}) => {
  if (!selectedHero) {
    return buildStatsSummary(memberRankings);
  }

  const selectedRanking = memberRankings.find(
    (entry) => entry.heroNpcName === selectedHero.npcName,
  );

  return buildStatsSummary(selectedRanking ? [selectedRanking] : []);
};

const StatPill = ({
  label,
  value,
  tone = "neutral",
  size = "default",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "primary" | "warning";
  size?: "default" | "compact";
}) => {
  const toneClass =
    tone === "primary"
      ? "border-primary/30 bg-primary/12 text-primary"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/12 text-amber-400"
        : "border-border/70 bg-muted/50 text-muted-foreground";
  const sizeClass =
    size === "compact"
      ? "gap-0.5 rounded-md px-1.5 py-0.75 text-[9px]"
      : "gap-1 rounded-md px-2 py-1 text-[10px]";

  return (
    <div
      className={`${toneClass} ${sizeClass} inline-flex max-w-full flex-wrap items-center border leading-tight`}
    >
      <span className="break-words">{label}</span>
      <span className="font-semibold whitespace-nowrap">{value}</span>
    </div>
  );
};

const StatsMetricCard = ({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) => (
  <div className="rounded-lg border border-border/70 bg-card/50 px-2.5 py-2">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`text-sm font-semibold ${valueClassName ?? ""}`}>{value}</p>
  </div>
);

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
  const bonusBreakdown = normalizeBonusBreakdown(point?.bonusBreakdown);
  const manualAdjustmentPoints = point?.manualAdjustmentPoints ?? 0;
  const autoTotalPoints = (point?.points ?? 0) - manualAdjustmentPoints;
  const fallbackBonusPoints =
    Math.round(Math.max(0, autoTotalPoints - basePoints) * 10000) / 10000;
  const bonusPoints =
    bonusBreakdown.length > 0
      ? Math.round(
          bonusBreakdown.reduce((sum, item) => sum + item.points, 0) * 10000,
        ) / 10000
      : fallbackBonusPoints;
  const totalPoints = point?.points ?? 0;
  const uncappedTotal = basePoints + bonusPoints;
  const capReduction = Math.max(0, uncappedTotal - autoTotalPoints);
  const trackingDurationPercentage =
    typeof point?.trackingDurationPercentage === "number"
      ? `${Math.round(point.trackingDurationPercentage)}%`
      : "—";
  const trackingDurationSeconds = point?.trackingDurationSeconds;
  const trackingDurationTime =
    typeof trackingDurationSeconds === "number" && trackingDurationSeconds >= 0
      ? formatDurationHuman(trackingDurationSeconds)
      : "—";
  const getBonusName = (bonus: (typeof bonusBreakdown)[number]): string => {
    if (bonus.ruleName) {
      return bonus.ruleName;
    }

    return t("events.kills.pointsTooltip.unnamedBonus", "Nienazwany bonus");
  };
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
      label: t("events.kills.pointsTooltip.basePoints"),
      value: formatPoints(basePoints),
      tone: "neutral" as const,
    },
    ...(bonusBreakdown.length > 0
      ? bonusBreakdown.map((bonus) => ({
          label: t("events.kills.pointsTooltip.bonusItem", {
            name: getBonusName(bonus),
          }),
          value: `+${formatPoints(bonus.points)}`,
          tone: "primary" as const,
        }))
      : bonusPoints > 0
        ? [
            {
              label: t("events.kills.pointsTooltip.bonusTotal", "Bonusy razem"),
              value: `+${formatPoints(bonusPoints)}`,
              tone: "primary" as const,
            },
          ]
        : []),
    ...(capReduction > 0
      ? [
          {
            label: t("events.kills.pointsTooltip.capReduction"),
            value: `-${formatPoints(capReduction)}`,
            tone: "warning" as const,
          },
        ]
      : []),
    ...(manualAdjustmentPoints !== 0
      ? [
          {
            label: t("events.kills.pointsTooltip.manualAdjustment"),
            value:
              manualAdjustmentPoints > 0
                ? `+${formatPoints(manualAdjustmentPoints)}`
                : formatPoints(manualAdjustmentPoints),
            tone: "warning" as const,
          },
        ]
      : []),
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
      <div className="rounded-xl border border-border/70 bg-card/40 p-2.5 shadow-sm transition-colors hover:border-primary/35 hover:bg-card/60">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {kill.heroNpc.npcIcon ? (
              <NpcTile
                npc={{
                  id: kill.heroNpc.npcId ?? undefined,
                  name: kill.heroNpc.npcName,
                  icon: kill.heroNpc.npcIcon,
                }}
              />
            ) : (
              <Skull className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {kill.heroNpc.npcName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatDateTime(new Date(kill.killedAt))}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[15px] leading-none font-bold text-primary">
              {formatPoints(totalPoints)}
              <span className="ml-1 text-[10px] font-medium">pkt</span>
            </p>
            {respawnDuration && (
              <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {respawnDuration}
              </p>
            )}
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {t("events.kills.trackingDurationTime")}: {trackingDurationTime}
            </p>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <StatPill
            label={t("events.kills.trackingCoverageShort")}
            value={trackingDurationPercentage}
            size="compact"
          />
          {kill.isManualClose && (
            <StatPill
              label={t("events.kills.manualCloseShort")}
              value={t("events.kills.manualCloseLabel")}
              tone="warning"
              size="compact"
            />
          )}
        </div>

        <div className="mt-1.5 space-y-1">
          {point ? (
            <div className="flex flex-wrap gap-1">
              {breakdownPills.map((pill) => (
                <StatPill
                  key={`${pill.label}:${pill.value}`}
                  label={pill.label}
                  value={pill.value}
                  tone={pill.tone}
                  size="compact"
                />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {t("events.kills.pointBreakdownUnavailable")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

const MemberSummarySidebar = ({
  member,
  memberId,
  eventName,
  selectedHero,
  contextStats,
  heroSummaries,
}: {
  member?: MemberIdentity;
  memberId?: string;
  eventName: string;
  selectedHero?: EventHeroNpc;
  contextStats: MemberStatsSummary;
  heroSummaries: HeroSummaryCard[];
}) => {
  const { t } = useTranslation();
  const avatarUrl = member
    ? getDiscordAvatarUrl(member.userId, member.avatar ?? null, 96)
    : undefined;

  return (
    <aside className="order-1 lg:order-2">
      <div className="space-y-4 lg:sticky lg:top-3">
        <Card className="gap-4 border-border bg-card/40 p-3 backdrop-blur-sm">
          <div className="hidden items-center gap-3 lg:flex">
            <Avatar className="h-12 w-12 rounded-xl ring-1 ring-border/70">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="rounded-xl text-sm">
                {member?.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("events.kills.memberStatsTitle")}
              </p>
              <h2 className="truncate text-base font-semibold">
                {member?.name ?? `#${memberId}`}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {selectedHero ? `${selectedHero.npcName} • ` : ""}
                {eventName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatsMetricCard
              label={t("events.kills.kpiKills")}
              value={contextStats.totalKills}
            />
            <StatsMetricCard
              label={t("events.kills.kpiPoints")}
              value={formatPoints(contextStats.totalPoints)}
              valueClassName="text-primary"
            />
            <StatsMetricCard
              label={t("events.kills.kpiTotalTime")}
              value={formatDurationHuman(contextStats.totalTimeSeconds)}
            />
            <StatsMetricCard
              label={t("events.kills.kpiAvgAfk")}
              value={formatPercentage(contextStats.avgAfkPercentage)}
            />
            <StatsMetricCard
              label={t("events.kills.kpiAvgPointsPerKill")}
              value={formatPoints(contextStats.avgPointsPerKill)}
            />
            <StatsMetricCard
              label={t("events.kills.kpiAvgTimePerKill")}
              value={formatDurationHuman(
                Math.round(contextStats.avgTimePerKillSeconds),
              )}
            />
          </div>
        </Card>

        <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold">
              {t("events.kills.heroSummaryTitle")}
            </h3>
          </div>

          {heroSummaries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("events.kills.noHeroSummary")}
            </p>
          ) : (
            <div className="space-y-2">
              {heroSummaries.map((summaryEntry) => (
                <div
                  key={summaryEntry.heroId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-gradient-to-r from-card/70 via-card/50 to-card/30 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {summaryEntry.npcIcon ? (
                      <NpcTile
                        npc={{
                          id: summaryEntry.npcId ?? undefined,
                          name: summaryEntry.npcName,
                          icon: summaryEntry.npcIcon,
                        }}
                      />
                    ) : (
                      <Skull className="h-4 w-4 shrink-0 text-red-500" />
                    )}
                    <p className="truncate text-sm font-semibold">
                      {summaryEntry.npcName}
                    </p>
                  </div>

                  <div className="flex max-w-[60%] shrink-0 flex-wrap justify-end gap-1.5">
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
        </Card>
      </div>
    </aside>
  );
};

const MemberKillsListSection = ({
  guildId,
  eventId,
  heroes,
  selectedHeroId,
  onSelectedHeroChange,
  allKills,
  isLoading,
  hasError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  guildId: string;
  eventId: string;
  heroes: EventHeroNpc[];
  selectedHeroId?: string;
  onSelectedHeroChange: (heroId?: string) => void;
  allKills: EventMemberKill[];
  isLoading: boolean;
  hasError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown> | unknown;
}) => {
  const { t } = useTranslation();
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const totalKills = allKills.length;
  const listVirtualizer = useVirtualizer({
    count: totalKills + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 180,
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
    enabled: totalKills > 0,
  });
  const virtualItems = listVirtualizer.getVirtualItems();

  useVirtualInfiniteScroll({
    enabled: totalKills > 0,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    itemCount: totalKills,
    virtualItems,
  });
  useResetScrollTop({
    resetKey: selectedHeroId ?? "all",
    scrollElementRef,
  });

  return (
    <section className="order-2 flex min-h-0 flex-1 flex-col gap-3 lg:order-1">
      {heroes.length > 0 && (
        <Card className="gap-2 border-border bg-card/40 p-2.5 backdrop-blur-sm">
          <Tabs
            value={selectedHeroId ?? "all"}
            onValueChange={(value) =>
              onSelectedHeroChange(value === "all" ? undefined : value)
            }
          >
            <EventScrollableTabsList>
              <TabsTrigger value="all" className="text-xs">
                {t("events.kills.allHeroes")}
              </TabsTrigger>
              {heroes.map((hero) => (
                <TabsTrigger key={hero.id} value={hero.id} className="text-xs">
                  <Swords className="mr-1 h-3 w-3" />
                  {hero.npcName}
                </TabsTrigger>
              ))}
            </EventScrollableTabsList>
          </Tabs>
        </Card>
      )}

      <Card className="flex min-h-0 flex-1 flex-col gap-2.5 border-border bg-card/40 p-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Skull className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold">
            {t("events.kills.memberHistoryTitle")}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : hasError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-xs">{t("events.error")}</p>
          </div>
        ) : totalKills === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <Skull className="mb-2 h-6 w-6 opacity-50" />
            <p className="text-xs">{t("events.kills.noKills")}</p>
          </div>
        ) : (
          <ScrollArea ref={scrollElementRef} className="min-h-0 flex-1">
            <div
              style={{
                height: `${listVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualItems.map((virtualItem) => {
                const isLoaderRow = virtualItem.index >= totalKills;
                const kill = allKills[virtualItem.index];

                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={listVirtualizer.measureElement}
                    className="pb-2.5"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {isLoaderRow ? (
                      hasNextPage ? (
                        <div className="relative flex h-14 items-center justify-center gap-2.5 rounded-xl border border-border/50 bg-card/30 backdrop-blur-md">
                          <Spinner className="h-4.5 w-4.5 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {t("events.kills.loading")}
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-14 items-center justify-center rounded-xl border border-border/50 bg-card/30 backdrop-blur-md">
                          <span className="text-xs text-muted-foreground">
                            {t("events.kills.endOfList")}
                          </span>
                        </div>
                      )
                    ) : kill ? (
                      <MemberKillCard
                        kill={kill}
                        guildId={guildId}
                        eventId={eventId}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </section>
  );
};

export const EventMemberKillsPage = () => {
  const {
    guildId,
    eventId,
    memberId,
    heroId: urlHeroId,
  } = useParams({
    strict: false,
  });

  return (
    <EventMemberKillsPageContent
      key={urlHeroId ?? "all"}
      guildId={guildId}
      eventId={eventId}
      memberId={memberId}
      initialHeroId={urlHeroId}
    />
  );
};

const EventMemberKillsPageContent = ({
  guildId,
  eventId,
  memberId,
  initialHeroId,
}: {
  guildId?: string;
  eventId?: string;
  memberId?: string;
  initialHeroId?: string;
}) => {
  const { t } = useTranslation();
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    initialHeroId,
  );
  const [showStats, setShowStats] = useState(false);

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

  const heroes = event?.heroNpcs ?? [];
  const allKills = killsData?.pages.flatMap((page) => page.data) ?? [];
  const member = killsData?.pages[0]?.member;
  const memberIdNumber = Number.parseInt(memberId ?? "", 10);
  const selectedHero = selectedHeroId
    ? heroes.find((hero) => hero.id === selectedHeroId)
    : undefined;
  const memberRankings = Number.isNaN(memberIdNumber)
    ? []
    : rankings.filter((ranking) => ranking.memberId === memberIdNumber);
  const heroSummaries = buildHeroSummaries({
    heroes,
    memberRankings,
    selectedHero,
  });
  const contextStats = buildContextStats({
    memberRankings,
    selectedHero,
  });

  if (eventLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
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
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <Card className="mx-3 mt-3 flex-row items-center justify-between gap-3 border-border bg-card/40 p-3 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-border/70">
            <AvatarImage
              src={
                member
                  ? getDiscordAvatarUrl(
                      member.userId,
                      member.avatar ?? null,
                      96,
                    )
                  : undefined
              }
            />
            <AvatarFallback className="rounded-xl text-sm">
              {member?.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t("events.kills.memberStatsTitle")}
            </p>
            <h2 className="truncate text-base font-semibold">
              {member?.name ?? `#${memberId}`}
            </h2>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setShowStats((s) => !s)}
        >
          <BarChart3 className="h-4 w-4" />
          {showStats
            ? t("events.kills.hideStats")
            : t("events.kills.showStats")}
        </Button>
      </Card>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 py-3 lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className={cn("contents", !showStats && "hidden lg:contents")}>
          <MemberSummarySidebar
            member={member}
            memberId={memberId}
            eventName={event.name}
            selectedHero={selectedHero}
            contextStats={contextStats}
            heroSummaries={heroSummaries}
          />
        </div>

        <MemberKillsListSection
          guildId={guildId ?? ""}
          eventId={eventId ?? ""}
          heroes={heroes}
          selectedHeroId={selectedHeroId}
          onSelectedHeroChange={setSelectedHeroId}
          allKills={allKills}
          isLoading={killsLoading}
          hasError={Boolean(killsError)}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </div>
    </div>
  );
};
