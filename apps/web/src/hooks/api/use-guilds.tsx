import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { Guild } from "@/hooks/api/use-guild";

export const useGuilds = () => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["user-guilds"],
    queryFn: () => client.get<Guild[]>(`/guilds/@me`),
    select: (response) => response.data,
  });

  return query;
};
