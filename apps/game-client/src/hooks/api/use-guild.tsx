import { useQuery } from "@tanstack/react-query";
import { fetchGuild, type Guild } from "@/api";

export type { Guild } from "@/api";

type UseGuildOptions = {
  guildId?: string;
  retry?: boolean;
};

const useGuild = ({ guildId, retry = true }: UseGuildOptions) => {
  const query = useQuery({
    queryKey: ["guilds", guildId],
    queryFn: () => fetchGuild(guildId as string),
    enabled: !!guildId,
    retry,
  });

  return query;
};
