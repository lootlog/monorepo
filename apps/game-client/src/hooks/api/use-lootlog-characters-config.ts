import {
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey,
  useUserLootlogConfigControllerGetUserLootlogConfigByAccountId,
  userLootlogConfigControllerGetUserLootlogConfigByAccountId,
  type UserLootlogConfigAccountResponseDtoOutput,
} from "@lootlog/client/main";
import { LOOTLOG_CHARACTERS_CONFIG_MUTATION_KEY } from "@/hooks/api/use-update-lootlog-characters-config";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";
import { queryClient } from "@/lib/query-client";
import { useGameStore } from "@/store/game.store";

const CHARACTERS_CONFIG_STALE_TIME = 60_000;

/**
 * The catching scope of every character on the current game account, keyed
 * by character id. Toggles write the cache optimistically, so the one
 * long-lived reading here stays current without refetching.
 */
export const useLootlogCharactersConfig = ({ enabled = true } = {}) => {
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? "");

  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId,
    });

  return useUserLootlogConfigControllerGetUserLootlogConfigByAccountId(
    { accountId },
    {
      query: {
        queryKey,
        queryFn: async ({ signal }) =>
          (await readGameClientBootstrap<UserLootlogConfigAccountResponseDtoOutput>(
            queryKey,
          )) ??
          userLootlogConfigControllerGetUserLootlogConfigByAccountId(
            { accountId },
            { signal },
          ),
        enabled: enabled && accountId !== "",
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: CHARACTERS_CONFIG_STALE_TIME,
      },
    },
  );
};

/** A failed save's rollback stores the earlier data stamped as never loaded. */
const UNCONFIRMED_UPDATED_AT = 0;

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

/**
 * The catching scope of a character outside React. A loaded configuration
 * without this character catches for none. A pending or failed load, a save
 * still in flight, or a failed save's rollback (stored as outdated), none of
 * which the API has confirmed (stamped as never loaded), leaves the scope unknown (`undefined`), so
 * callers defer to the API: it may already know a scope this cache has not
 * seen. An older load stays authoritative, because the API rejects every
 * report of a character that catches for none; a read past the stale time
 * refreshes it in the background instead.
 */
export const getFreshCharacterCatchingGuildIds = (
  accountId: string,
  characterId: string,
): readonly string[] | undefined => {
  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId,
    });

  const state =
    queryClient.getQueryState<UserLootlogConfigAccountResponseDtoOutput>(
      queryKey,
    );

  if (
    state?.status !== "success" ||
    state.dataUpdatedAt === UNCONFIRMED_UPDATED_AT ||
    queryClient.isMutating({
      mutationKey: LOOTLOG_CHARACTERS_CONFIG_MUTATION_KEY,
    }) > 0
  ) {
    return undefined;
  }

  if (Date.now() - state.dataUpdatedAt >= CHARACTERS_CONFIG_STALE_TIME) {
    void queryClient.invalidateQueries({ queryKey, refetchType: "active" });
  }

  return state.data?.[characterId]?.catchingGuildIds ?? NO_ORGANIZATIONS;
};
