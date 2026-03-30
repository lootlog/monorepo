import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationsClient } from "./use-notifications-client";
import type { NotificationRule } from "./types";

export const useNotificationRules = (ownerType: string, ownerId: string) => {
  const { client } = useNotificationsClient();

  return useQuery<NotificationRule[]>({
    queryKey: ["notification-rules", ownerType, ownerId],
    queryFn: async () => {
      const { data } = await client.get("/rules", {
        params: { ownerType, ownerId },
      });
      return data;
    },
    enabled: !!ownerId,
  });
};

export const useCreateNotificationRule = () => {
  const { client } = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      ownerType: "guild" | "user";
      ownerId: string;
      triggerType: "timer_before_spawn" | "npc_spawned" | "watched_item_dropped";
      guildId?: string;
      world?: string;
      filters?: Record<string, unknown>;
      leadTimeMinutes?: number;
      dedupeWindowSeconds?: number;
      enabled?: boolean;
      targetIds?: string[];
    }) => {
      const { data } = await client.post("/rules", dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notification-rules", variables.ownerType, variables.ownerId],
      });
    },
  });
};

export const useUpdateNotificationRule = () => {
  const { client } = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ownerType,
      ownerId,
      ...dto
    }: {
      id: string;
      ownerType: string;
      ownerId: string;
      enabled?: boolean;
      filters?: Record<string, unknown>;
      leadTimeMinutes?: number;
      targetIds?: string[];
    }) => {
      const { data } = await client.patch(`/rules/${id}`, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notification-rules", variables.ownerType, variables.ownerId],
      });
    },
  });
};

export const useDeleteNotificationRule = () => {
  const { client } = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { id: string; ownerType: string; ownerId: string }) => {
      const { data } = await client.delete(`/rules/${variables.id}`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notification-rules", variables.ownerType, variables.ownerId],
      });
    },
  });
};
