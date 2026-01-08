import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";

interface AssignMemberOptions {
  eventId: string;
  mapId: string;
  memberId: number;
}

interface UnassignMemberOptions {
  eventId: string;
  mapId: string;
  memberId?: number;
}

export const useAssignMember = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async ({ eventId, mapId, memberId }: AssignMemberOptions) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/assign`,
        { memberId },
      );
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["event", guildId, eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });
};

export const useUnassignMember = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async ({ eventId, mapId, memberId }: UnassignMemberOptions) => {
      const url = memberId
        ? `/guilds/${guildId}/events/${eventId}/maps/${mapId}/assign?memberId=${memberId}`
        : `/guilds/${guildId}/events/${eventId}/maps/${mapId}/assign`;
      const response = await client.delete(url);
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["event", guildId, eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });
};

interface SelfAssignOptions {
  eventId: string;
  mapId: string;
}

export const useSelfAssignMember = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async ({ eventId, mapId }: SelfAssignOptions) => {
      const response = await client.post(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/self-assign`,
      );
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["event", guildId, eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });
};

export const useSelfUnassignMember = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async ({ eventId, mapId }: SelfAssignOptions) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/${eventId}/maps/${mapId}/self-assign`,
      );
      return response.data;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: ["event", guildId, eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events", guildId] });
    },
  });
};
