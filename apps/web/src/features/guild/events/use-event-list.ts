import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useToggleEventPin } from "@/features/guild/events/hooks/mutations/use-toggle-event-pin";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getListEventsQueryKey,
  useDeleteEvent,
  useListEvents,
  type EventListItemResponseDto,
} from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";

import type { Event } from "./types/api";

const listEventsParams = {
  activeOnly: "false",
};

export const useEventList = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ strict: false });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const currentTimestamp = useMinuteTimestamp();
  const queryClient = useQueryClient();
  const { data: accessPolicy } = useGuildPermissions();
  const hasGuildId = Boolean(guildId);

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

  const {
    togglePin,
    isPinned,
    isPending: isPinPending,
  } = useToggleEventPin(guildId ?? "");

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
    accessPolicy?.allows(Permission.ADMIN) ||
    accessPolicy?.allows(Permission.OWNER);

  const normalizedSearch = searchValue.trim().toLocaleLowerCase();

  const filteredEvents =
    events?.filter((event) =>
      event.name.toLocaleLowerCase().includes(normalizedSearch),
    ) ?? [];

  const hasEvents = (events?.length ?? 0) > 0;
  const hasFilteredEvents = filteredEvents.length > 0;

  return {
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
  };
};
