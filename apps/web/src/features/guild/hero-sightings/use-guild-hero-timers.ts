import { useQueries } from "@tanstack/react-query";
import { getTimersControllerGetHeroTimersQueryOptions } from "@lootlog/client/main";
import { useGuildWorldScope } from "@/hooks/context/use-guild-world-scope";

export const useGuildHeroTimers = () => {
  const { guildId, worlds } = useGuildWorldScope();

  return useQueries({
    queries: (worlds ?? []).map((timersWorld) =>
      getTimersControllerGetHeroTimersQueryOptions(
        { guildId: guildId ?? "" },
        { world: timersWorld },
        { query: { enabled: Boolean(guildId), staleTime: 60_000 } },
      ),
    ),
    combine: (results) => results.flatMap((result) => result.data ?? []),
  });
};
