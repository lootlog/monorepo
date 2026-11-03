import { useQueries } from "@tanstack/react-query";
import { getTimersControllerGetHeroTimersQueryOptions } from "@lootlog/client/main";
import { useGuildWorldScope } from "@/hooks/context/use-guild-world-scope";

/**
 * The latest timer of every hero on the Organization's world, or on every
 * world it plays on, expired and deleted ones included. Live timers come from
 * the timers list; these say when the board lost a hero's window.
 */
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
