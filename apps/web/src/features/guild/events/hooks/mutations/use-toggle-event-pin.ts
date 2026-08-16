import { useMutationState, useQueryClient } from "@tanstack/react-query";
import {
  getListPinnedEventsQueryKey,
  useListPinnedEvents,
  usePinEvent,
  useUnpinEvent,
} from "@lootlog/api-client/react-query/main/events";
import type { PinnedEventResponseDto } from "@lootlog/api-client/models/main/pinned-event-response-dto";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  addPinnedEvent,
  removePinnedEvent,
  restorePinnedEvent,
} from "./event-pin-cache";

type PinMutationVariables = {
  pathParams: {
    eventId: string;
    guildId: string;
  };
};

export const useToggleEventPin = (guildId: string) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const pinnedEventsQueryKey = getListPinnedEventsQueryKey({ guildId });
  const { data: pinnedEvents = [] } = useListPinnedEvents(
    { guildId },
    {
      query: {
        enabled: Boolean(guildId),
        queryKey: pinnedEventsQueryKey,
        refetchInterval: 60_000,
      },
    },
  );

  const pinEvent = usePinEvent({
    mutation: {
      onMutate: async ({ pathParams }) => {
        await queryClient.cancelQueries({ queryKey: pinnedEventsQueryKey });
        return { eventId: pathParams.eventId };
      },
      onSuccess: (pinnedEvent) => {
        queryClient.setQueryData<PinnedEventResponseDto[]>(
          pinnedEventsQueryKey,
          (currentPinnedEvents = []) =>
            addPinnedEvent(currentPinnedEvents, pinnedEvent),
        );
      },
      onError: (_error, { pathParams }) => {
        queryClient.setQueryData<PinnedEventResponseDto[]>(
          pinnedEventsQueryKey,
          (currentPinnedEvents = []) =>
            removePinnedEvent(currentPinnedEvents, pathParams.eventId)
              .pinnedEvents,
        );
        toast.error(t("events.pinError"));
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: pinnedEventsQueryKey });
      },
    },
  });

  const unpinEvent = useUnpinEvent({
    mutation: {
      onMutate: async ({ pathParams }) => {
        await queryClient.cancelQueries({ queryKey: pinnedEventsQueryKey });
        const currentPinnedEvents =
          queryClient.getQueryData<PinnedEventResponseDto[]>(
            pinnedEventsQueryKey,
          ) ?? [];
        const removal = removePinnedEvent(
          currentPinnedEvents,
          pathParams.eventId,
        );

        queryClient.setQueryData<PinnedEventResponseDto[]>(
          pinnedEventsQueryKey,
          removal.pinnedEvents,
        );

        return removal;
      },
      onError: (_error, _variables, context) => {
        const removedPinnedEvent = context?.removedPinnedEvent;
        if (removedPinnedEvent) {
          queryClient.setQueryData<PinnedEventResponseDto[]>(
            pinnedEventsQueryKey,
            (currentPinnedEvents = []) =>
              restorePinnedEvent(
                currentPinnedEvents,
                removedPinnedEvent,
                context.removedIndex,
              ),
          );
        }
        toast.error(t("events.unpinError"));
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: pinnedEventsQueryKey });
      },
    },
  });

  const pendingPinPaths = useMutationState({
    filters: { mutationKey: ["pinEvent"], status: "pending" },
    select: (mutation) =>
      (mutation.state.variables as PinMutationVariables | undefined)
        ?.pathParams,
  });
  const pendingUnpinPaths = useMutationState({
    filters: { mutationKey: ["unpinEvent"], status: "pending" },
    select: (mutation) =>
      (mutation.state.variables as PinMutationVariables | undefined)
        ?.pathParams,
  });

  const isPinned = (eventId: string) =>
    pinnedEvents.some(({ event }) => event.id === eventId);
  const isPending = (eventId: string) =>
    [...pendingPinPaths, ...pendingUnpinPaths].some(
      (pathParams) =>
        pathParams?.guildId === guildId && pathParams.eventId === eventId,
    );

  const togglePin = (event: PinnedEventResponseDto["event"]) => {
    if (isPending(event.id)) {
      return;
    }

    if (isPinned(event.id)) {
      unpinEvent.mutate({ pathParams: { guildId, eventId: event.id } });
      return;
    }

    queryClient.setQueryData<PinnedEventResponseDto[]>(
      pinnedEventsQueryKey,
      (currentPinnedEvents = []) =>
        addPinnedEvent(currentPinnedEvents, {
          event,
          pinnedAt: new Date().toISOString(),
        }),
    );
    pinEvent.mutate({ pathParams: { guildId, eventId: event.id } });
  };

  return { togglePin, isPinned, isPending };
};
