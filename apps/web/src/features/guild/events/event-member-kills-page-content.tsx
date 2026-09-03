import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  getListEventRankingQueryKey,
  getShowEventOverviewQueryKey,
  useListEventRanking,
  useShowEventOverview,
} from "@lootlog/client/main";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { MemberKillsFilter } from "./components/member-kills/member-kills-filter";
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
  const { t } = useTranslation();
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
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.error", "Nie znaleziono eventu")}
        </p>
        <Link to="/$guildId/events" params={{ guildId: queryGuildId }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
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
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
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
          <MemberKillsFilter
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
