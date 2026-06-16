import type { QueryClient } from "@tanstack/react-query";
import { userLootlogConfigControllerGetPlayerCatchingGuilds } from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import type {
  UserLootlogPlayerCatchingGuildsResponseDtoOutput,
  UserLootlogPlayersCatchingGuildsResponseDtoOutputPlayersItem,
} from "@/lib/api/generated/main/model";
import {
  type CharacterTooltipCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";

export const CATCHING_GUILDS_STALE_TIME = 1000 * 60 * 5;

export function getCharacterTooltipCatchingGuildsQueryKey(
  target: CharacterTooltipCatchingGuildsTarget,
) {
  return [
    "character-tooltip-catching-guilds",
    target.accountId,
    target.characterId,
  ] as const;
}

export function applyCatchingGuildsSuccess(
  player:
    | UserLootlogPlayerCatchingGuildsResponseDtoOutput
    | UserLootlogPlayersCatchingGuildsResponseDtoOutputPlayersItem,
): void {
  useCharacterTooltipCatchingGuildsStore
    .getState()
    .setSuccess(`${player.accountId}:${player.characterId}`, player.guilds);
}

export function applyCatchingGuildsLoading(
  targets: CharacterTooltipCatchingGuildsTarget[],
): void {
  const store = useCharacterTooltipCatchingGuildsStore.getState();

  for (const target of targets) {
    store.setLoading(target.key);
  }
}

export function applyCatchingGuildsError(
  targets: CharacterTooltipCatchingGuildsTarget[],
): void {
  const store = useCharacterTooltipCatchingGuildsStore.getState();

  for (const target of targets) {
    store.setError(target.key);
  }
}

export function getTargetsMissingSuccessfulCatchingGuilds(
  targets: CharacterTooltipCatchingGuildsTarget[],
): CharacterTooltipCatchingGuildsTarget[] {
  const entriesByKey =
    useCharacterTooltipCatchingGuildsStore.getState().entriesByKey;

  return targets.filter((target) => {
    const entry = entriesByKey[target.key];
    return entry?.status !== "loading" && entry?.status !== "success";
  });
}

export async function fetchSingleCatchingGuilds(
  queryClient: QueryClient,
  target: CharacterTooltipCatchingGuildsTarget,
): Promise<void> {
  applyCatchingGuildsLoading([target]);

  try {
    const response = await queryClient.fetchQuery({
      gcTime: CATCHING_GUILDS_STALE_TIME,
      queryFn: () =>
        userLootlogConfigControllerGetPlayerCatchingGuilds({
          accountId: target.accountId,
          characterId: target.characterId,
        }),
      queryKey: getCharacterTooltipCatchingGuildsQueryKey(target),
      staleTime: CATCHING_GUILDS_STALE_TIME,
    });

    applyCatchingGuildsSuccess(response);
  } catch {
    applyCatchingGuildsError([target]);
  }
}
