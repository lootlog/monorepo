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
  ChevronRight,
} from "lucide-react";
import { Badge } from "@lootlog/ui/components/badge";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import { getApiErrorStatus } from "@lootlog/api-client/transport";
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
} from "@lootlog/api-client/react-query/main/events";
import type { EventListItemResponseDto } from "@lootlog/api-client/models/main/event-list-item-response-dto";
import type { Event } from "./types/api";
import { cn } from "@lootlog/ui/lib/utils";

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
    <ScrollArea className="h-full bg-background">
      <div className="flex flex-col gap-3 px-3 py-3">
        <Card className="gap-0 border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-tight">
                  {t("events.title")}
                </h2>
                <p className="mt-1 text-xs leading-tight text-muted-foreground">
                  {t("events.description")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="size-4" />
              {t("events.create")}
            </Button>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="flex-row items-stretch gap-0 overflow-hidden border-border bg-card p-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="flex gap-3">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 border-l border-border px-2">
                  <Skeleton className="size-8 rounded-lg" />
                  {canDeleteEvent && <Skeleton className="size-8 rounded-lg" />}
                </div>
              </Card>
            ))}
          </div>
        ) : events?.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-4 bg-card px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Trophy className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("events.noEvents")}
            </p>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="size-4" />
              {t("events.create")}
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
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
              const formattedWorld =
                event.world.charAt(0).toUpperCase() + event.world.slice(1);

              return (
                <Card
                  key={event.id}
                  className={cn(
                    "flex-row items-stretch gap-0 overflow-hidden border-border bg-card p-0 transition-colors",
                    isEventActive &&
                      "border-yellow-500/40 bg-yellow-500/[0.025]",
                  )}
                >
                  <Link
                    to="/$guildId/events/$eventId"
                    params={{ guildId: guildId ?? "", eventId: event.id }}
                    className="group/event flex min-w-0 flex-1 items-center gap-3 p-4 outline-none transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                  >
                    <div
                      className={cn(
                        "relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
                        isEventActive && "bg-yellow-500/10",
                      )}
                    >
                      <Trophy
                        className={cn(
                          "size-4 text-muted-foreground",
                          isEventActive && "text-yellow-500",
                        )}
                      />
                      {isEventActive && (
                        <span className="absolute -right-0.5 -top-0.5 flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-yellow-500" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="min-w-0 break-words text-base font-semibold leading-tight">
                          {event.name}
                        </h3>
                        <Badge
                          variant={eventStatusVariant}
                          className="h-5 px-2 text-[11px]"
                        >
                          {eventStatusLabel}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Globe className="size-3.5" />
                          {formattedWorld}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Swords className="size-3.5" />
                          {t("events.heroes.count", {
                            count: event.heroNpcs?.length ?? 0,
                          })}
                        </span>
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <CalendarDays className="size-3.5 shrink-0" />
                          <span>
                            {format(
                              new Date(event.startsAt ?? event.createdAt),
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
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/event:translate-x-0.5 group-hover/event:text-foreground" />
                  </Link>

                  <div className="flex shrink-0 items-center gap-1 border-l border-border px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title={
                        isPinned(event.id)
                          ? t("events.unpinEvent")
                          : t("events.pinEvent")
                      }
                      aria-label={
                        isPinned(event.id)
                          ? t("events.unpinEvent")
                          : t("events.pinEvent")
                      }
                      onClick={() => togglePin(event.id)}
                    >
                      <Star
                        className={cn(
                          "size-4 text-muted-foreground",
                          isPinned(event.id) &&
                            "fill-yellow-500 text-yellow-500",
                        )}
                      />
                    </Button>
                    {canDeleteEvent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t("events.delete")}
                        title={t("events.delete")}
                        onClick={() => setEventToDelete(event)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </Card>
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
