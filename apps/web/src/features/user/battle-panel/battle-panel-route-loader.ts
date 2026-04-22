import type { QueryClient } from "@tanstack/react-query";
import { getBattlesControllerGetUserCharactersQueryOptions } from "@/lib/api/generated/battlelog/battles/battles";

type EnsureBattlePanelCharacterIdOptions = {
  queryClient: QueryClient;
  characterId?: string;
};

export const ensureBattlePanelCharacterId = async ({
  queryClient,
  characterId,
}: EnsureBattlePanelCharacterIdOptions) => {
  const charactersResponse = await queryClient.ensureQueryData(
    getBattlesControllerGetUserCharactersQueryOptions(),
  );
  return characterId ?? charactersResponse.characters[0]?.id;
};
