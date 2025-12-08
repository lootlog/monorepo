import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";

interface CreateTemplateData {
  name: string;
  heroNpcs: {
    npcId: number;
    npcName: string;
    maps: string[];
  }[];
}

export const useCreateTemplate = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const response = await client.post(
        `/guilds/${guildId}/events/templates`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", guildId],
      });
    },
  });
};

export const useDeleteTemplate = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await client.delete(
        `/guilds/${guildId}/events/templates/${templateId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["templates", guildId],
      });
    },
  });
};
