import type { QueryClient } from "@tanstack/react-query";
import { battleCharactersQueryOptions } from "@/hooks/api/battle-log/use-battle-characters";

type EnsureBattlePanelCharacterIdOptions = {
  queryClient: QueryClient;
  characterId?: string;
  suppressRouteErrorToast?: boolean;
};

export const ensureBattlePanelCharacterId = async ({
  queryClient,
  characterId,
  suppressRouteErrorToast = true,
}: EnsureBattlePanelCharacterIdOptions) => {
  const characters = await queryClient.ensureQueryData(
    battleCharactersQueryOptions({
      suppressRouteErrorToast,
    }),
  );
  return characterId ?? characters[0]?.id;
};
