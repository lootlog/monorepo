import { EventLoadError } from "./components/event-load-error";
import { sumBy } from "es-toolkit";
import { SectionLoading } from "@/components/common/section-loading";
import { useState } from "react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  getListEventRankingQueryKey,
  getShowEventOverviewQueryKey,
  useListEventRanking,
  useShowEventOverview,
} from "@lootlog/client/main";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { HeroKillsFilter } from "@/features/guild/events/components/shared/hero-kills-filter";
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
  const totalKills = sumBy(rankings, (ranking) => ranking.totalKills);

  const totalPoints = sumBy(rankings, (ranking) => ranking.totalPoints);

  const totalTimeSeconds = sumBy(
    rankings,
    (ranking) => ranking.totalTimeSeconds,
  );

  const weightedAfkSum = sumBy(
    rankings,
    (ranking) => ranking.avgAfkPercentage * ranking.totalKills,
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

  if (eventLoading) {
    return <SectionLoading />;
  }

  if (eventError || !event) {
    return <EventLoadError guildId={queryGuildId} />;
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea ref={setScrollElement} className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 px-3 py-3">
          <MemberSummaryStrip
            member={member}
            memberId={memberId}
            eventName={event.name}
            selectedHeroName={selectedHero?.npcName}
            contextStats={contextStats}
          />
          <HeroKillsFilter
            variant="member"
            heroes={heroes}
            selectedHeroId={selectedHeroId}
            onSelectedHeroChange={setSelectedHeroId}
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
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
