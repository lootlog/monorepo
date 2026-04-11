import type { QueryClient } from "@tanstack/react-query";
import { battleCharactersQueryOptions } from "@/hooks/api/battle-log/use-battle-characters";

type EnsureBattlePanelCharacterIdOptions = {
  queryClient: QueryClient;
  characterId?: string;
};

export const ensureBattlePanelCharacterId = async ({
  queryClient,
  characterId,
}: EnsureBattlePanelCharacterIdOptions) => {
  const characters = await queryClient.ensureQueryData(
    battleCharactersQueryOptions(),
  );
  return characterId ?? characters[0]?.id;
};
