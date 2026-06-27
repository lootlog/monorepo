import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import { getApiErrorStatus } from "@/lib/api-client/api-client";
import { useToggleEventPin } from "@/features/guild/events/hooks/mutations/use-toggle-event-pin";
import { EventCreateDialog } from "./components/dialogs/event-create-dialog";
import { EventActionDialog } from "./components/dialogs/event-action-dialog";
import { getEventStatusAtTimestamp } from "./utils/event-activity";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getListEventsQueryKey,
  useDeleteEvent,
  useListEvents,
} from "@/lib/api/generated/main/events/events";
import type { EventListItemResponseDto } from "@/lib/api/generated/main/model";
import type { Event } from "./types/api";

export const Events = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ strict: false });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const queryClient = useQueryClient();
  const { data: permissions } = useGuildPermissions();
  const hasGuildId = Boolean(guildId);
  const listEventsParams = {
    activeOnly: "false",
  };
  const listEventsQueryKey = getListEventsQueryKey(
    { guildId: guildId ?? "" },
    listEventsParams,
  );
  const deleteEvent = useDeleteEvent<
    unknown,
    EventListItemResponseDto[] | undefined
  >({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({
          queryKey: listEventsQueryKey,
        });

        const previousEvents =
          queryClient.getQueryData<EventListItemResponseDto[]>(
            listEventsQueryKey,
          );

        queryClient.setQueryData<EventListItemResponseDto[]>(
          listEventsQueryKey,
          (currentEvents) =>
            currentEvents?.filter(
              (event) => event.id !== variables.pathParams.eventId,
            ) ?? currentEvents,
        );

        return previousEvents;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListEventsQueryKey({ guildId: guildId ?? "" }),
        });
      },
      onError: (_error, _variables, previousEvents) => {
        queryClient.setQueryData(listEventsQueryKey, previousEvents);
      },
    },
  });
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
  } = useListEvents(
    {
      guildId: guildId ?? "",
    },
    listEventsParams,
    {
      query: {
        enabled: hasGuildId,
        queryKey: listEventsQueryKey,
      },
    },
  );

  const canDeleteEvent =
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  if (error) {
    const isForbidden = getApiErrorStatus(error) === 403;

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
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="border-border bg-card/40 p-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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
        <EventActionDialog
          open={!!eventToDelete}
          onOpenChange={(open) => {
            if (!open) setEventToDelete(null);
          }}
          eventName={eventToDelete?.name ?? ""}
          requireNameConfirmation
          titleKey="events.deleteDialog.title"
          descriptionKey="events.deleteDialog.description"
          actionLabelKey="events.delete"
          variant="destructive"
          isPending={deleteEvent.isPending}
          onConfirm={async () => {
            if (!eventToDelete) return;
            try {
              await deleteEvent.mutateAsync({
                pathParams: {
                  guildId: guildId ?? "",
                  eventId: eventToDelete.id,
                },
              });
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
