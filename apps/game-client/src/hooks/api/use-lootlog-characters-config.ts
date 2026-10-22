import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
} from "@lootlog/client/main";
import { useGameStore } from "@/store/game.store";

/**
 * The catching scope of every character on the current game account, keyed
 * by character id. Toggles write the cache optimistically, so the one
 * long-lived reading here stays current without refetching.
 */
export const useLootlogCharactersConfig = ({ enabled = true } = {}) => {
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");

  return useUserLootlogConfigControllerGetUserLootlogConfigByAccountId(
    { accountId },
    {
      query: {
        queryKey:
          getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey(
            { accountId },
          ),
        enabled: enabled && accountId !== "",
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
    },
  );
};

const NO_ORGANIZATIONS: readonly string[] = [];

/**
 * The Lootlogs the current character plays for: its loot, timers and
 * presence go there. A loaded configuration without this character catches
 * for none; `undefined` until the configuration loads.
 */
export const useCurrentCharacterCatchingGuildIds = ():
  | readonly string[]
  | undefined => {
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? null,
  );

  const { data: charactersConfig } = useLootlogCharactersConfig();

  return charactersConfig && characterId
    ? (charactersConfig[characterId]?.catchingGuildIds ?? NO_ORGANIZATIONS)
    : undefined;
};
