import {
  SectionCard as Card,
  SectionCard,
} from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { EventListCard } from "./event-list-card";

import { getApiErrorStatus } from "@lootlog/client/transport";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { AlertCircle, Plus, SearchX, ShieldX, Trophy } from "lucide-react";
import { toast } from "sonner";
import { EventActionDialog } from "./components/dialogs/event-action-dialog";
import { EventCreateDialog } from "./components/dialogs/event-create-dialog";

import { SearchInput } from "@/components/ui/search-input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";

import { useEventList } from "./use-event-list";

export const Events = () => {
  const {
    t,
    searchValue,
    setSearchValue,
    isLoading,
    setCreateDialogOpen,
    canDeleteEvent,
    hasEvents,
    hasFilteredEvents,
    filteredEvents,
    currentTimestamp,
    isPinned,
    guildId,
    isPinPending,
    togglePin,
    setEventToDelete,
    createDialogOpen,
    eventToDelete,
    deleteEvent,
    error,
  } = useEventList();

  if (error) {
    const isForbidden = getApiErrorStatus(error) === 403;

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 max-h-full overflow-y-auto [justify-content:safe_center]">
        <h1 className="sr-only">{t("events.title")}</h1>
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      <h1 className="sr-only">{t("events.title")}</h1>
      <div className="px-3 pt-3">
        <SectionCard className="rounded-xl">
          <SectionCardContent className="p-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t("events.searchPlaceholder")}
                className="h-9"
                wrapperClassName="min-w-0 flex-1"
                disabled={isLoading}
              />
              <Button
                size="sm"
                className="h-9 w-full shrink-0 sm:w-auto"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="size-4" />
                {t("events.create")}
              </Button>
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {isLoading ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-2 px-3 pb-3">
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
                    {canDeleteEvent && (
                      <Skeleton className="size-8 rounded-lg" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : !hasEvents ? (
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 pb-3 md:[align-items:safe_center]">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Trophy />
                </EmptyMedia>
                <EmptyTitle>{t("events.noEvents")}</EmptyTitle>
                <EmptyDescription>
                  {t("events.emptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="size-4" />
                  {t("events.create")}
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : !hasFilteredEvents ? (
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 pb-3 md:[align-items:safe_center]">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>{t("events.noResults")}</EmptyTitle>
                <EmptyDescription>
                  {t("events.noResultsDescription")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchValue("")}
                >
                  {t("events.clearSearch")}
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-2 px-3 pb-3">
              {filteredEvents.map((event) => (
                <EventListCard
                  key={event.id}
                  event={event}
                  currentTimestamp={currentTimestamp}
                  t={t}
                  isPinned={isPinned}
                  guildId={guildId}
                  isPinPending={isPinPending}
                  togglePin={togglePin}
                  canDeleteEvent={canDeleteEvent}
                  setEventToDelete={setEventToDelete}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

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
  );
};
