import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotificationsClient } from "./use-notifications-client";
import type { WatchedItem } from "./types";

export const useWatchedItems = () => {
  const { client } = useNotificationsClient();

  return useQuery<WatchedItem[]>({
    queryKey: ["watched-items"],
    queryFn: async () => {
      const { data } = await client.get("/watched-items");
      return data;
    },
  });
};

export const useCreateWatchedItem = () => {
  const { client } = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      itemId: number;
      itemName: string;
      itemIcon?: string;
      world?: string;
      targetIds?: string[];
    }) => {
      const { data } = await client.post("/watched-items", dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["watched-items"],
      });
    },
  });
};

export const useDeleteWatchedItem = () => {
  const { client } = useNotificationsClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await client.delete(`/watched-items/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["watched-items"],
      });
    },
  });
};
