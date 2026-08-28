import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Permission } from "@lootlog/types";
import { EventRankingTable } from "./components/ranking/event-ranking-table";
import { EventRankingFilter } from "./components/ranking/event-ranking-filter";
import { EventRankingSummary } from "./components/ranking/event-ranking-summary";
import { AlertCircle } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useState } from "react";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getListEventRankingQueryKey,
  getShowEventOverviewQueryKey,
  useListEventRanking,
  useShowEventOverview,
} from "@lootlog/api-client/react-query/main/events";
import {
  getMembersControllerGetMeQueryKey,
  useMembersControllerGetMe,
} from "@lootlog/api-client/react-query/main/members";

const valueOr = <Value,>(value: Value | null | undefined, fallback: Value) =>
  value ?? fallback;

const getRankingSelection = <
  Hero extends { npcName: string },
  Ranking extends { heroNpcName: string },
>(
  heroes: Hero[],
  rankings: Ranking[],
  selectedHeroName: string | null,
) => {
  const heroNamesWithRankings = new Set(
    rankings.map((ranking) => ranking.heroNpcName),
  );
  const defaultHeroName =
    heroes.find((hero) => heroNamesWithRankings.has(hero.npcName))?.npcName ??
    heroes[0]?.npcName ??
    null;
  const effectiveSelectedHeroName =
    selectedHeroName && heroes.some((hero) => hero.npcName === selectedHeroName)
      ? selectedHeroName
      : defaultHeroName;
  return {
    effectiveSelectedHeroName,
    filteredRankings: effectiveSelectedHeroName
      ? rankings.filter(
          (ranking) => ranking.heroNpcName === effectiveSelectedHeroName,
        )
      : rankings,
  };
};

export const EventRankingPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(null);
  const hasEventRouteParams = Boolean(guildId && eventId);
  const queryGuildId = valueOr(guildId, "");
  const queryEventId = valueOr(eventId, "");

  const { data: permissions } = useGuildPermissions();
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
    permissions?.includes(Permission.OWNER) ||
    permissions?.includes(Permission.ADMIN);

  const {
    data: event,
    isLoading: isEventLoading,
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
    data: rankings = [],
    isLoading: isRankingLoading,
    error: rankingError,
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
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
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
        <Link to="/$guildId/events" params={{ guildId: queryGuildId }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }

  const heroes = valueOr(event.heroNpcs, []);
  const { effectiveSelectedHeroName, filteredRankings } = getRankingSelection(
    heroes,
    rankings,
    selectedHeroName,
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
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
          <EventRankingFilter
            heroes={heroes}
            selectedHeroName={effectiveSelectedHeroName}
            onSelectedHeroChange={setSelectedHeroName}
          />

          {rankingError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t(
                "events.ranking.error",
                "Nie udało się pobrać rankingu. Dane mogą być niepełne.",
              )}
            </div>
          )}

          <EventRankingTable
            rankings={filteredRankings}
            guildId={guildId}
            eventId={eventId}
            canEdit={canEditPoints}
            currentMemberId={currentMember?.id}
          />
        </div>
      </ScrollArea>
    </div>
  );
};
