import { useQuery } from "@tanstack/react-query";
import { fetchGuildWorlds } from "@/api";

type UseWorldOptions = {
  guildId?: string;
};

export const useWorlds = ({ guildId }: UseWorldOptions) => {
  const query = useQuery({
    queryKey: ["worlds", guildId],
    queryFn: () => fetchGuildWorlds(guildId as string),
    enabled: !!guildId,
  });

  return query;
};
