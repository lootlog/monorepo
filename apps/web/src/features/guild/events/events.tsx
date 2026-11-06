import { EmptyState } from "@/components/common/empty-state";
import { ListToolbar } from "@/components/common/list-toolbar";
import { EventListCard } from "./event-list-card";
import { EventListCardSkeleton } from "./event-list-card-skeleton";
import { EventLoadError } from "./components/event-load-error";

import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Plus, SearchX, Trophy } from "lucide-react";
import { toast } from "@lootlog/ui/components/sonner";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
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
            fill
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
            fill
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
      <ConfirmDialog
        key={eventToDelete?.id}
        open={!!eventToDelete}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null);
        }}
        title={t("events.deleteDialog.title")}
        description={t("events.deleteDialog.description", {
          name: eventToDelete?.name ?? "",
        })}
        confirmText={eventToDelete?.name ?? ""}
        confirmLabel={t("events.deleteDialog.confirmHint", {
          name: eventToDelete?.name ?? "",
        })}
        confirmButtonLabel={t("events.delete")}
        cancelButtonLabel={t("common.cancel")}
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
          } catch (error) {
            toast.error(t("events.deleteError"));
            throw error;
          }
        }}
      />
    </div>
  );
};
