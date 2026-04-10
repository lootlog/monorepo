import type { QueryClient } from "@tanstack/react-query";
import { battleCharactersQueryOptions } from "@/hooks/api/battle-log/use-battle-characters";
import { useBattleFiltersStore } from "@/store/battle-filters.store";

type EnsureBattlePanelCharacterIdOptions = {
  queryClient: QueryClient;
  suppressRouteErrorToast?: boolean;
};

export const ensureBattlePanelCharacterId = async ({
  queryClient,
  suppressRouteErrorToast = true,
}: EnsureBattlePanelCharacterIdOptions) => {
  const characters = await queryClient.ensureQueryData(
    battleCharactersQueryOptions({
      suppressRouteErrorToast,
    }),
  );
  const currentCharacterId =
    useBattleFiltersStore.getState().currentCharacterId;

  return currentCharacterId ?? characters[0]?.id;
};

export const getBattlePanelFilters = (characterId: string | undefined) => {
  return useBattleFiltersStore.getState().getFilters(characterId);
};
