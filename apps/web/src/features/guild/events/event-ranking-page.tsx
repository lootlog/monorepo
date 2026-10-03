import { getRankingSelection } from "./components/ranking/event-ranking-selection";
import { EventLoadError } from "./components/event-load-error";
import { EventRankingSkeleton } from "./event-ranking-skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { EventReadError } from "./components/shared/event-read-error";
import { useTranslation } from "react-i18next";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Permission } from "@lootlog/schema/permissions";
import { EventRankingTable } from "./components/ranking/event-ranking-table";
import { HeroTabs } from "./components/shared/hero-tabs";
import { EventRankingSummary } from "./components/ranking/event-ranking-summary";
import { useState } from "react";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getListEventRankingQueryKey,
  getShowEventOverviewQueryKey,
  useListEventRanking,
  useShowEventOverview,
  getMembersControllerGetMeQueryKey,
  useMembersControllerGetMe,
} from "@lootlog/client/main";

export const EventRankingPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(null);
  const hasEventRouteParams = Boolean(guildId && eventId);
  const queryGuildId = guildId ?? "";
  const queryEventId = eventId ?? "";

  const { data: accessPolicy } = useGuildPermissions();

  const { data: currentMember } = useMembersControllerGetMe(
    { guildId: queryGuildId },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: getMembersControllerGetMeQueryKey({
          guildId: queryGuildId,
        }),
        staleTime: 30_000,
      },
    },
  );

  const canEditPoints =
    accessPolicy?.allows(Permission.OWNER) ||
    accessPolicy?.allows(Permission.ADMIN);

  const {
    data: event,
    isLoading: isEventLoading,
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
    data: rankings = [],
    isLoading: isRankingLoading,
    error: rankingError,
    refetch: refetchRanking,
    isFetching: isRankingFetching,
  } = useListEventRanking(
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

  if (isEventLoading || isRankingLoading) {
    return <EventRankingSkeleton />;
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

  const { effectiveSelectedHeroName, filteredRankings } = getRankingSelection(
    heroes,
    rankings,
    selectedHeroName,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-3 px-3 py-3">
          <EventRankingSummary
            eventName={event.name}
            selectedHeroName={effectiveSelectedHeroName}
          />
          <HeroTabs
            placement="page"
            heroes={heroes}
            valueKey="npcName"
            value={effectiveSelectedHeroName ?? undefined}
            onValueChange={(heroName) => setSelectedHeroName(heroName ?? null)}
          />

          {rankingError && (
            <SectionCard>
              <EventReadError
                message={t("events.ranking.error")}
                onRetry={() => void refetchRanking()}
                isRetrying={isRankingFetching}
              />
            </SectionCard>
          )}

          {/* A failed refresh keeps the last ranking; a failed first load has none to show. */}
          {(!rankingError || rankings.length > 0) && (
            <EventRankingTable
              rankings={filteredRankings}
              guildId={guildId}
              eventId={eventId}
              canEdit={canEditPoints}
              currentMemberId={currentMember?.id}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
