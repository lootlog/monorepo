import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import { isRecord } from "@lootlog/schema/records";
import { queryClient } from "@/lib/query-client";
import { useGameStore } from "@/store/game.store";

export function getGroupFightSettingsParams() {
  const game = useGameStore.getState().game;
  return {
    domains: "gameData",
    gameAccountId: game?.hero.accountId,
    characterId: game?.hero.characterId,
  };
}

export function groupFightCollectionEnabled(
  data: SettingsDocumentsResponseDtoOutput | undefined,
): boolean {
  const setting = data?.domains.gameData?.effective.groupFights;
  return isRecord(setting) && setting.enabled === true;
}

export function isGroupFightCollectionEnabled(): boolean {
  const state = queryClient.getQueryState<SettingsDocumentsResponseDtoOutput>(
    getSettingsDocumentsControllerGetPreferencesQueryKey(
      getGroupFightSettingsParams(),
    ),
  );
  return state?.status === "success" && groupFightCollectionEnabled(state.data);
}
