import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Trophy, Plus, Swords, CalendarDays, AlertCircle } from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { type Event, useEvents } from "@/features/events/hooks/queries/use-events";
import { EventCreateDialog } from "./components/event-create-dialog";

export const Events = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ strict: false });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    data: events,
    isLoading,
    error,
  } = useEvents({
    guildId: guildId ?? "",
    activeOnly: false,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.error", "Błąd ładowania eventów")}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-4">
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {t("events.title")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {t("events.description")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("events.create")}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : events?.length === 0 ? (
          <div className="px-3">
            <Card className="flex flex-col items-center justify-center py-12 gap-3 bg-card/40 backdrop-blur-sm">
              <Trophy className="w-12 h-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t("events.noEvents")}</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("events.create")}
              </Button>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-3">
            {events?.map((event: Event) => (
              <Link
                key={event.id}
                to="/$guildId/events/$eventId"
                params={{ guildId: guildId ?? "", eventId: event.id }}
              >
                <Card
                  className={`p-3 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all cursor-pointer ${
                    event.active
                      ? "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:border-yellow-500/70"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Trophy
                          className={`w-4 h-4 ${event.active ? "text-yellow-500" : "text-muted-foreground"}`}
                        />
                        {event.active && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{event.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <div className="flex items-center gap-1">
                            <Swords className="w-3 h-3" />
                            <span>
                              {t("events.heroes.count", {
                                count: event.heroNpcs?.length || 0,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            <span>
                              {format(
                                new Date(event.startsAt || event.createdAt),
                                "d MMM yyyy",
                                {
                                  locale: pl,
                                },
                              )}
                              {" – "}
                              {event.endsAt
                                ? format(new Date(event.endsAt), "d MMM yyyy", {
                                    locale: pl,
                                  })
                                : t("events.ongoing")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge variant={event.active ? "default" : "secondary"}>
                      {event.active ? t("events.active") : t("events.inactive")}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <EventCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </ScrollArea>
  );
};
