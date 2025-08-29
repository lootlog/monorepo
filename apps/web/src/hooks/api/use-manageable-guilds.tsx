import { useApiClient } from "@/hooks/api/use-api-client";
import { Guild } from "@/hooks/api/use-guild";
import { useQuery } from "@tanstack/react-query";

export const useManageableGuilds = () => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["manageable-guilds"],
    queryFn: () => client.get<Guild[]>(`/guilds/@me/manageable`),
    select: (response) => response.data,
  });

  return query;
};
