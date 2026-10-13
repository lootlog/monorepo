import { EventLoadError } from "./components/event-load-error";
import { EventMemberSkeleton } from "./event-member-skeleton";
import { useState } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  getEventsRankingControllerGetEventHeroStatsQueryKey,
  getListEventRankingQueryKey,
  getShowEventOverviewQueryKey,
  useEventsRankingControllerGetEventHeroStats,
  useListEventRanking,
  useShowEventOverview,
} from "@lootlog/client/main";
import { getMemberDisplayRole } from "@lootlog/domain/member-display-role";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { HeroTabs } from "./components/shared/hero-tabs";
import { MemberKillsList } from "./components/member-kills/member-kills-list";
import { MemberSummaryStrip } from "./components/member-kills/member-summary-strip";
import type { MemberStatsSummary } from "./components/member-kills/member-kills-view-model";
import { useEventMemberKillHistory } from "./hooks/queries/use-event-member-kill-history";
import type { EventHeroNpc, EventRanking } from "./types/api";

type RankingSummaryInput = Pick<
  EventRanking,
  "totalKills" | "totalPoints" | "totalTimeSeconds" | "avgAfkPercentage"
>;

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

  return {
    totalKills,
    totalPoints,
    totalTimeSeconds,
    avgAfkPercentage: totalKills > 0 ? weightedAfkSum / totalKills : 0,
    avgPointsPerKill: totalKills > 0 ? totalPoints / totalKills : 0,
    avgTimePerKillSeconds: totalKills > 0 ? totalTimeSeconds / totalKills : 0,
  };
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

/**
 * The member's place in one hero's ranking, ordered by points as the ranking
 * table is; rankings are per hero, so there is no place across heroes.
 */
const getRankingPlace = (
  rankings: EventRanking[],
  memberId: number,
  heroName: string,
) => {
  const heroRankings = rankings
    .filter((ranking) => ranking.heroNpcName === heroName)
    .sort((left, right) => right.totalPoints - left.totalPoints);

  const index = heroRankings.findIndex(
    (ranking) => ranking.memberId === memberId,
  );

  return index < 0
    ? undefined
    : { position: index + 1, playerCount: heroRankings.length };
};

/** Where the member stands in the event for the heroes the page shows. */
const getMemberEventContext = ({
  heroes,
  selectedHero,
  rankings,
  memberRankings,
  memberId,
  heroStats,
}: {
  heroes: EventHeroNpc[];
  selectedHero?: EventHeroNpc;
  rankings: EventRanking[];
  memberRankings: EventRanking[];
  memberId: number;
  heroStats?: { heroId: string; killCount: number }[];
}) => {
  const rankingHero =
    selectedHero ?? (heroes.length === 1 ? heroes[0] : undefined);

  return {
    rankingPlace: rankingHero
      ? getRankingPlace(rankings, memberId, rankingHero.npcName)
      : undefined,
    eventKillCount: heroStats
      ?.filter((stats) => !selectedHero || stats.heroId === selectedHero.id)
      .reduce((sum, stats) => sum + stats.killCount, 0),
    roleColor:
      getCustomRoleCssColor(
        getMemberDisplayRole(memberRankings[0]?.member.roles)?.color,
      ) ?? undefined,
  };
};

type EventMemberKillsPageContentProps = {
  guildId?: string;
  eventId?: string;
  memberId?: string;
  initialHeroId?: string;
};

export const EventMemberKillsPageContent = ({
  guildId,
  eventId,
  memberId,
  initialHeroId,
}: EventMemberKillsPageContentProps) => {
  const [selectedHeroId, setSelectedHeroId] = useState<string | undefined>(
    initialHeroId,
  );

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  const hasEventRouteParams = Boolean(guildId && eventId);
  const queryGuildId = guildId ?? "";
  const queryEventId = eventId ?? "";
  const queryMemberId = memberId ?? "";

  const {
    data: event,
    isLoading: eventLoading,
    error: eventError,
    refetch: refetchEvent,
  } = useShowEventOverview(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getShowEventOverviewQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  const {
    data: killsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: killsLoading,
    error: killsError,
    isFetchNextPageError,
    isFetching,
    refetch,
  } = useEventMemberKillHistory({
    guildId: queryGuildId,
    eventId: queryEventId,
    memberId: queryMemberId,
    heroId: selectedHeroId,
    limit: 20,
  });

  const { data: rankings = [] } = useListEventRanking(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getListEventRankingQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  const { data: heroStats } = useEventsRankingControllerGetEventHeroStats(
    {
      guildId: queryGuildId,
      eventId: queryEventId,
    },
    {
      query: {
        enabled: hasEventRouteParams,
        queryKey: getEventsRankingControllerGetEventHeroStatsQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  if (eventLoading) {
    return <EventMemberSkeleton />;
  }

  if (eventError || !event) {
    return (
      <EventLoadError
        backTo="event"
        guildId={queryGuildId}
        eventId={queryEventId}
        error={eventError}
        onRetry={() => refetchEvent()}
      />
    );
  }

  const heroes = event.heroNpcs ?? [];
  const allKills = killsData?.pages.flatMap((page) => page.data) ?? [];
  const member = killsData?.pages[0]?.member;
  const memberIdNumber = Number.parseInt(queryMemberId, 10);

  const selectedHero = selectedHeroId
    ? heroes.find((hero) => hero.id === selectedHeroId)
    : undefined;

  const memberRankings = Number.isNaN(memberIdNumber)
    ? []
    : rankings.filter((ranking) => ranking.memberId === memberIdNumber);

  const contextStats = buildContextStats({
    memberRankings,
    selectedHero,
  });

  const { rankingPlace, eventKillCount, roleColor } = getMemberEventContext({
    heroes,
    selectedHero,
    rankings,
    memberRankings,
    memberId: memberIdNumber,
    heroStats,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea
        data-under-top-bar
        ref={setScrollElement}
        className="min-h-0 flex-1"
      >
        <div className="flex flex-col gap-3 px-3 py-3">
          <MemberSummaryStrip
            member={member}
            memberId={memberId}
            eventName={event.name}
            contextStats={contextStats}
            roleColor={roleColor}
            rankingPlace={rankingPlace}
            eventKillCount={eventKillCount}
            filters={
              <HeroTabs
                placement="page"
                heroes={heroes}
                includeAll
                value={selectedHeroId}
                onValueChange={setSelectedHeroId}
              />
            }
          />
          {scrollElement && (
            <MemberKillsList
              guildId={queryGuildId}
              eventId={queryEventId}
              scrollElement={scrollElement}
              resetKey={selectedHeroId ?? "all"}
              allKills={allKills}
              isLoading={killsLoading}
              hasError={Boolean(killsError)}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              onRetry={() =>
                void (isFetchNextPageError ? fetchNextPage() : refetch())
              }
              isRetrying={isFetching}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
