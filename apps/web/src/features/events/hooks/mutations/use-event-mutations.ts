import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateKillQueries } from "./invalidate-kill-queries";
import type {
  EventScoringMode,
  EventScoringRules,
} from "../../types/scoring-rules";

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
}

interface CreateMapData {
  mapId: number;
  mapName: string;
}

export const useEventMutations = (guildId: string, eventId: string) => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();
  const queryKeyOverview = ["event-overview", guildId, eventId];
  const queryKeyMaps = ["event-maps", guildId, eventId];
  const queryKeyWrapped = ["event-wrapped", guildId, eventId];

  const updateEvent = useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const response = await client.patch(
        `/guilds/${guildId}/events/${eventId}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  const recalculatePoints = useMutation({
    mutationFn: async () => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/recalculate-points`,
      );
      return response.data;
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
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
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
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
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
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });

  const deleteHero = useMutation({
    mutationFn: async (heroId: string) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeyOverview });
      queryClient.invalidateQueries({ queryKey: queryKeyMaps });
      queryClient.invalidateQueries({ queryKey: queryKeyWrapped });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
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
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/heroes/${heroId}/maps`,
        data,
      );
      return response.data;
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
      return response.data;
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
