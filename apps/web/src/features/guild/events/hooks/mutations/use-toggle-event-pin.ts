import {
  useMutationState,
  useQueryClient,
  type Mutation,
} from "@tanstack/react-query";
import {
  getListPinnedEventsQueryKey,
  useListPinnedEvents,
  usePinEvent,
  useUnpinEvent,
  type PinnedEventResponseDto,
} from "@lootlog/client/main";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  addPinnedEvent,
  removePinnedEvent,
  restorePinnedEvent,
} from "./event-pin-cache";

import { Option, Schema } from "effect";

const decodePinMutationVariables = Schema.decodeUnknownOption(
  Schema.Struct({
    pathParams: Schema.Struct({
      eventId: Schema.String,
      guildId: Schema.String,
    }),
  }),
);

const selectPinPathParams = (mutation: Mutation) =>
  Option.getOrUndefined(decodePinMutationVariables(mutation.state.variables))
    ?.pathParams;

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
    select: selectPinPathParams,
  });

  const pendingUnpinPaths = useMutationState({
    filters: { mutationKey: ["unpinEvent"], status: "pending" },
    select: selectPinPathParams,
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
