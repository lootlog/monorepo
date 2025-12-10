import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";

export interface MapItem {
  id: number;
  name: string;
}

export interface MapTemplate {
  id: string;
  guildId: string;
  name: string;
  maps: MapItem[];
  createdAt: string;
}

interface UseMapTemplatesOptions {
  guildId?: string;
}

export const useMapTemplates = (options?: UseMapTemplatesOptions) => {
  const contextGuildId = useGuildId();
  const guildId = options?.guildId ?? contextGuildId;
  const { client } = useApiClient();

  return useQuery({
    queryKey: ["map-templates", guildId],
    queryFn: async () => {
      const response = await client.get<MapTemplate[]>(
        `/guilds/${guildId}/map-templates`,
      );
      return response.data;
    },
    enabled: !!guildId,
  });
};
