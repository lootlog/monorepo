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

const UNCONFIRMED_UPDATED_AT = 0;

const NO_ORGANIZATIONS: readonly string[] = [];

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
