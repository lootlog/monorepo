import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsList, TabsTrigger } from "@lootlog/ui/components/tabs";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Permission } from "@lootlog/types";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventRanking } from "./hooks/queries/use-event-ranking";
import { EventRankingTable } from "./components/ranking/event-ranking-table";
import { Trophy, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { useEventSocket } from "./hooks/socket/use-event-socket";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";

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

  useEventSocket({
    eventId,
    guildId,
  });

  if (isEventLoading || isRankingLoading) {
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
          <Button variant="outline">Powrót do listy</Button>
        </Link>
      </div>
    );
  }

  const heroes = event.heroNpcs || [];
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
      <div className="flex flex-col gap-3">
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {t("events.ranking.title")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {event.name}
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 flex flex-col gap-4">
          {heroes.length > 0 && (
            <Tabs
              value={effectiveSelectedHeroName ?? heroes[0]?.npcName}
              onValueChange={setSelectedHeroName}
            >
              <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {heroes.map((hero) => (
                  <TabsTrigger
                    key={hero.id}
                    value={hero.npcName}
                    className="flex-shrink-0"
                  >
                    {hero.npcName}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
            {rankingError && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
      </div>
    </ScrollArea>
  );
};
