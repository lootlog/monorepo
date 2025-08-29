import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

type UseWorldOptions = {
  guildId?: string;
  retry?: boolean;
};

export const useWorlds = ({ guildId }: UseWorldOptions) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["worlds", guildId],
    queryFn: () => client.get<string[]>(`/guilds/${guildId}/worlds`),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};
