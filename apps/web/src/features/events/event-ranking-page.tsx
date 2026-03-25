import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Permission } from "@lootlog/types";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventRanking } from "./hooks/queries/use-event-ranking";
import { EventRankingTable } from "./components/ranking/event-ranking-table";
import { Trophy, AlertCircle } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useState } from "react";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { EventScrollableTabsList } from "./components/shared/event-scrollable-tabs-list";

export const EventRankingPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(null);

  const { data: permissions } = useGuildPermissions();
  const canEditPoints =
    permissions?.includes(Permission.OWNER) ||
    permissions?.includes(Permission.ADMIN);

  const {
    data: event,
    isLoading: isEventLoading,
    error: eventError,
  } = useEventOverview({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const {
    data: rankings = [],
    isLoading: isRankingLoading,
    error: rankingError,
  } = useEventRanking({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

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
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }

  const heroes = event.heroNpcs ?? [];
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

  const filteredRankings = effectiveSelectedHeroName
    ? rankings.filter(
        (ranking) => ranking.heroNpcName === effectiveSelectedHeroName,
      )
    : rankings;

  return (
    <ScrollArea className="h-full bg-background/50">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="gap-4 border-border bg-card/40 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="rounded-xl bg-primary/10 p-2 shadow-inner shadow-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("events.ranking.title")}
              </p>
              <h2 className="truncate text-base font-semibold">{event.name}</h2>
              <p className="text-xs text-muted-foreground">
                {effectiveSelectedHeroName ??
                  t("events.kills.allHeroes", "Wszyscy herosi")}
              </p>
            </div>
          </div>
        </Card>

        {heroes.length > 0 && (
          <Card className="gap-2 border-border bg-card/40 p-2.5 backdrop-blur-sm">
            <Tabs
              value={effectiveSelectedHeroName ?? heroes[0]?.npcName}
              onValueChange={setSelectedHeroName}
            >
              <EventScrollableTabsList>
                {heroes.map((hero) => (
                  <TabsTrigger key={hero.id} value={hero.npcName}>
                    {hero.npcName}
                  </TabsTrigger>
                ))}
              </EventScrollableTabsList>
            </Tabs>
          </Card>
        )}

        <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
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
          />
        </Card>
      </div>
    </ScrollArea>
  );
};
