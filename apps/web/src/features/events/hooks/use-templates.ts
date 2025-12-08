import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";

export interface Template {
  id: string;
  guildId: string;
  name: string;
  heroNpcs: {
    npcId: number;
    npcName: string;
    maps: string[];
  }[];
  createdAt: string;
}

export const useTemplates = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  return useQuery({
    queryKey: ["templates", guildId],
    queryFn: async () => {
      const response = await client.get<Template[]>(
        `/guilds/${guildId}/events/templates`,
      );
      return response.data;
    },
    enabled: !!guildId,
  });
};
