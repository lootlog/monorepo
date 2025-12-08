import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  Trophy,
  Plus,
  Swords,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Event, useEvents } from "@/features/events/hooks/use-events";

export const Events = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ strict: false });

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
    <div className="flex flex-col gap-4">
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
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
          <Link
            to="/$guildId/events/templates"
            params={{ guildId: guildId ?? "" }}
          >
            <Button size="sm" variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              {t("events.templates.title", "Szablony")}
            </Button>
          </Link>
          <Link
            to="/$guildId/events/create"
            params={{ guildId: guildId ?? "" }}
          >
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t("events.create")}
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : events?.length === 0 ? (
        <div className="px-3">
          <Card className="flex flex-col items-center justify-center h-64 gap-4 bg-card/40 backdrop-blur-sm">
            <Trophy className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">{t("events.noEvents")}</p>
            <Link
              to="/$guildId/events/create"
              params={{ guildId: guildId ?? "" }}
            >
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("events.create")}
              </Button>
            </Link>
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
                className={`p-4 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all cursor-pointer ${
                  event.active
                    ? "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:border-yellow-500/70"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Trophy
                        className={`w-5 h-5 ${event.active ? "text-yellow-500" : "text-muted-foreground"}`}
                      />
                      {event.active && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{event.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1.5">
                          <Swords className="w-4 h-4" />
                          <span>
                            {event.heroNpcs?.length || 0}{" "}
                            {t("events.heroes.title").toLowerCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
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
                              : t("events.ongoing", "W trakcie")}
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
    </div>
  );
};
