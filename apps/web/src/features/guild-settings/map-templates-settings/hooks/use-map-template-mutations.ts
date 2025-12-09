import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { MapItem } from "./use-map-templates";

interface CreateMapTemplateData {
  name: string;
  maps: MapItem[];
}

export const useCreateMapTemplate = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async (data: CreateMapTemplateData) => {
      const response = await client.post(
        `/guilds/${guildId}/map-templates`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["map-templates", guildId],
      });
    },
  });
};

export const useDeleteMapTemplate = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await client.delete(
        `/guilds/${guildId}/map-templates/${templateId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["map-templates", guildId],
      });
    },
  });
};
