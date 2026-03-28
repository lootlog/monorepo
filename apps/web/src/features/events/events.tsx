import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Trophy,
  Plus,
  Swords,
  CalendarDays,
  AlertCircle,
  Globe,
  ShieldX,
  Trash2,
  Star,
} from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import {
  type Event,
  useEvents,
} from "@/features/events/hooks/queries/use-events";
import { useDeleteEvent } from "@/features/events/hooks/mutations/use-delete-event";
import { useToggleEventPin } from "@/features/events/hooks/mutations/use-toggle-event-pin";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { EventCreateDialog } from "./components/dialogs/event-create-dialog";
import { DeleteEventDialog } from "./components/dialogs/delete-event-dialog";
import { getEventStatusAtTimestamp } from "./utils";
import { Spinner } from "@lootlog/ui/components/spinner";

export const Events = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ strict: false });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const { data: permissions } = useGuildPermissions();
  const deleteEvent = useDeleteEvent(guildId ?? "");
  const { togglePin, isPinned } = useToggleEventPin(guildId ?? "");

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const {
    data: events,
    isLoading,
    error,
  } = useEvents({
    guildId: guildId ?? "",
    activeOnly: false,
  });

  const canDeleteEvent =
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  if (error) {
    const isForbidden = isAxiosError(error) && error.response?.status === 403;

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        {isForbidden ? (
          <>
            <ShieldX className="w-12 h-12 text-destructive" />
            <p className="text-muted-foreground">{t("events.accessDenied")}</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="text-muted-foreground">{t("events.error")}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                <Trophy className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight">
                  {t("events.title")}
                </h2>
                <p className="text-xs text-muted-foreground leading-tight">
                  {t("events.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("events.create")}
              </Button>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner className="h-8 w-8" />
          </div>
        ) : events?.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 bg-card/40 py-12 backdrop-blur-sm">
            <Trophy className="w-12 h-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">{t("events.noEvents")}</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("events.create")}
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {events?.map((event: Event) => {
              const eventStatus = getEventStatusAtTimestamp(
                event,
                currentTimestamp,
              );
              const isEventActive = eventStatus === "active";
              const eventStatusLabel =
                eventStatus === "upcoming"
                  ? t("events.upcoming")
                  : eventStatus === "ended"
                    ? t("events.ended")
                    : t("events.active");
              const eventStatusVariant =
                eventStatus === "active"
                  ? "default"
                  : eventStatus === "upcoming"
                    ? "outline"
                    : "secondary";

              return (
                <Link
                  key={event.id}
                  to="/$guildId/events/$eventId"
                  params={{ guildId: guildId ?? "", eventId: event.id }}
                >
                  <Card
                    className={`p-3 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all cursor-pointer ${
                      isEventActive
                        ? "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:border-yellow-500/70"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Trophy
                            className={`w-4 h-4 ${isEventActive ? "text-yellow-500" : "text-muted-foreground"}`}
                          />
                          {isEventActive && (
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              <span>{event.world}</span>
                            </div>
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
                                  ? format(
                                      new Date(event.endsAt),
                                      "d MMM yyyy",
                                      {
                                        locale: pl,
                                      },
                                    )
                                  : t("events.ongoing")}
                              </span>
                            </div>
                            <Badge variant={eventStatusVariant}>
                              {eventStatusLabel}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={
                            isPinned(event.id)
                              ? t("events.unpinEvent")
                              : t("events.pinEvent")
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePin(event.id);
                          }}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isPinned(event.id)
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                        {canDeleteEvent && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEventToDelete(event);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <EventCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
        <DeleteEventDialog
          open={!!eventToDelete}
          onOpenChange={(open) => {
            if (!open) setEventToDelete(null);
          }}
          eventName={eventToDelete?.name ?? ""}
          requireEventNameConfirmation
          isPending={deleteEvent.isPending}
          onConfirm={async () => {
            if (!eventToDelete) return;
            try {
              await deleteEvent.mutateAsync(eventToDelete.id);
              toast.success(t("events.deleteSuccess"));
              setEventToDelete(null);
            } catch {
              toast.error(t("events.deleteError"));
            }
          }}
        />
      </div>
    </ScrollArea>
  );
};
