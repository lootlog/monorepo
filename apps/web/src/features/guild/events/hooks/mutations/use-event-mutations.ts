import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateKillQueries } from "./invalidate-kill-queries";
import { queryKeys } from "@/lib/query-keys";
import type {
  EventScoringMode,
  EventScoringRules,
} from "../../types/scoring-rules";
import {
  getListEventsQueryKey,
  getShowEventOverviewQueryKey,
} from "@/lib/api/generated/main/events/events";

export interface UpdateEventData {
  name?: string;
  startsAt?: string;
  endsAt?: string | null;
  assignmentTimeoutMinutes?: number;
  participationConfirmationMinutes?: number;
  mapAssignmentCap?: number;
  rulebookMarkdown?: string | null;
  scoringMode?: EventScoringMode;
  scoringRules?: EventScoringRules | null;
}

interface HeroMapData {
  mapId: number;
  mapName: string;
}

interface CreateHeroData {
  npcId?: number;
  npcName: string;
  maps?: HeroMapData[];
}

interface UpdateHeroData {
  npcName: string;
  npcId?: number;
}

interface CreateMapData {
  mapId: number;
  mapName: string;
}

interface EventMapMutationResponse {
  id: string;
}

export const useEventMutations = (guildId: string, eventId: string) => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const queryKeyOverview = getShowEventOverviewQueryKey({ guildId, eventId });
  const queryKeyMaps = queryKeys.events.maps(guildId, eventId);
  const queryKeyWrapped = queryKeys.events.wrapped(guildId, eventId);
  const queryKeyEventsList = getListEventsQueryKey({ guildId });

  const updateEvent = useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({ queryKey: queryKeyEventsList });
    },
  });

  const recalculatePoints = useMutation({
    mutationFn: async () => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/recalculate-points`,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      invalidateKillQueries(queryClient, guildId, eventId);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async () => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}`,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeyEventsList,
      });
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
    },
  });

  const addHero = useMutation({
    mutationFn: async (data: CreateHeroData) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/heroes`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({
        queryKey: queryKeyEventsList,
      });
    },
  });

  const updateHero = useMutation({
    mutationFn: async ({
      heroId,
      data,
    }: {
      heroId: string;
      data: UpdateHeroData;
    }) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({
        queryKey: queryKeyEventsList,
      });
    },
  });

  const deleteHero = useMutation({
    mutationFn: async (heroId: string) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}`,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({
        queryKey: queryKeyEventsList,
      });
    },
  });

  const addMap = useMutation({
    mutationFn: async ({
      heroId,
      data,
    }: {
      heroId: string;
      data: CreateMapData;
    }) => {
      const response = await client.post<EventMapMutationResponse>(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/maps`,
        data,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
    },
  });

  const deleteMap = useMutation({
    mutationFn: async ({
      heroId,
      mapId,
    }: {
      heroId: string;
      mapId: string;
    }) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/maps/${mapId}`,
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
    },
  });

  return {
    updateEvent,
    recalculatePoints,
    deleteEvent,
    addHero,
    updateHero,
    deleteHero,
    addMap,
    deleteMap,
  };
};
