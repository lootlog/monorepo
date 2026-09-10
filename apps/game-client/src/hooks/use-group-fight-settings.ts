import { useSettingsDocumentsControllerGetPreferences } from "@lootlog/client/main";
import { useGameStore } from "@/store/game.store";

export function useGroupFightSettings() {
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);
  return useSettingsDocumentsControllerGetPreferences(
    { domains: "gameData", gameAccountId: accountId, characterId },
    {
      query: {
        enabled: !!accountId && !!characterId,
        staleTime: 60_000,
        retry: false,
        refetchOnWindowFocus: true,
      },
    },
  );
}
