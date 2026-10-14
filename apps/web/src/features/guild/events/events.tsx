import { EmptyState } from "@/components/common/empty-state";
import { ListToolbar } from "@/components/common/list-toolbar";
import { EventListCard } from "./event-list-card";
import { EventListCardSkeleton } from "./event-list-card-skeleton";
import { EventLoadError } from "./components/event-load-error";

import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Plus, SearchX, Trophy } from "lucide-react";
import { toast } from "sonner";
import { EventActionDialog } from "./components/dialogs/event-action-dialog";
import { EventCreateDialog } from "./components/dialogs/event-create-dialog";

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
    refetch,
  } = useEventList();

  if (error) {
    return (
      <EventLoadError
        backTo="none"
        guildId={guildId ?? ""}
        error={error}
        titles={{ 500: t("events.loadError.listTitle") }}
        onRetry={() => refetch()}
      />
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <EventListCardSkeleton
              key={index}
              canDeleteEvent={canDeleteEvent}
            />
          ))}
        </div>
      );
    }

    if (!hasEvents) {
      return (
        <div className="p-3">
          <EmptyState
            framed
            icon={Trophy}
            title={t("events.noEvents")}
            description={t("events.emptyDescription")}
            action={
              <Button
                onClick={() => setCreateDialogOpen(true)}
                icon=<Plus className="size-4" />
              >
                {t("events.create")}
              </Button>
            }
          />
        </div>
      );
    }

    if (!hasFilteredEvents) {
      return (
        <div className="p-3">
          <EmptyState
            framed
            icon={SearchX}
            title={t("events.noResults")}
            description={t("events.noResultsDescription")}
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchValue("")}
              >
                {t("events.clearSearch")}
              </Button>
            }
          />
        </div>
      );
    }

    return filteredEvents.map((event) => (
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
    ));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("events.title")}</h1>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <ListToolbar
          search={searchValue}
          onSearchChange={setSearchValue}
          placeholder={t("events.filterPlaceholder")}
          label={t("events.filterLabel")}
          clearLabel={t("events.clearSearch")}
          disabled={isLoading}
        >
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => setCreateDialogOpen(true)}
            icon=<Plus className="size-4" />
          >
            {t("events.create")}
          </Button>
        </ListToolbar>
        {renderContent()}
      </ScrollArea>
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
