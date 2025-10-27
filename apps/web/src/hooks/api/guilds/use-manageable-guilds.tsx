import { useApiClient } from "@/hooks/api/use-api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";
import { useQuery } from "@tanstack/react-query";

export const useManageableGuilds = (enabled = true) => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["manageable-guilds"],
    queryFn: () => client.get<Guild[]>(`/guilds/@me/manageable`),
    select: (response) => response.data,
    enabled,
    staleTime: 0,
  });

  return query;
};
