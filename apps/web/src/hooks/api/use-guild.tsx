import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  vanityUrl?: string;
};

type UseGuildOptions = {
  retry?: boolean;
};

export const useGuild = ({ retry = true }: UseGuildOptions) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["guilds", guildId],
    queryFn: () => client.get<Guild>(`/guilds/${guildId}`),
    enabled: !!guildId,
    select: (response) => response.data,
    retry,
  });

  return query;
};
