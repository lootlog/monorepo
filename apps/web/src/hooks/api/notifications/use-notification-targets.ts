import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationsClient } from "./use-notifications-client";
import type { NotificationTarget } from "./types";

export const useNotificationTargets = (ownerType: string, ownerId: string) => {
  const { client } = useNotificationsClient();

  return useQuery<NotificationTarget[]>({
    queryKey: ["notification-targets", ownerType, ownerId],
    queryFn: async () => {
      const { data } = await client.get("/targets", {
        params: { ownerType, ownerId },
      });
      return data;
    },
    enabled: !!ownerId,
  });
};

export const useCreateNotificationTarget = () => {
  const { client } = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      ownerType: "guild" | "user";
      ownerId: string;
      provider: "discord";
      targetType: "channel" | "dm";
      externalId: string;
      displayName?: string;
      guildName?: string;
    }) => {
      const { data } = await client.post("/targets", dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notification-targets", variables.ownerType, variables.ownerId],
      });
    },
  });
};

export const useDeleteNotificationTarget = () => {
  const { client } = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { id: string; ownerType: string; ownerId: string }) => {
      const { data } = await client.delete(`/targets/${variables.id}`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notification-targets", variables.ownerType, variables.ownerId],
      });
    },
  });
};
