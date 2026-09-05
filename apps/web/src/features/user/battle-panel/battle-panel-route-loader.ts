import type { QueryClient } from "@tanstack/react-query";
import { getBattlesControllerGetUserCharactersQueryOptions } from "@lootlog/client/battlelog";

type EnsureBattlePanelCharacterIdOptions = {
  queryClient: QueryClient;
  characterId?: string;
};

export const ensureBattlePanelCharacterId = async ({
  queryClient,
  characterId,
}: EnsureBattlePanelCharacterIdOptions) => {
  if (characterId) {
    return characterId;
  }

  const charactersResponse = await queryClient.ensureQueryData(
    getBattlesControllerGetUserCharactersQueryOptions(),
  );
  return characterId ?? charactersResponse.characters[0]?.id;
};
