import {
  characterAurasControllerGetOwnAura,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  useCharacterAurasControllerGetOwnAura,
  type OwnCharacterAuraResponseDto,
} from "@lootlog/client/main";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";

/** The aura the signed-in User wears and whether they may choose one. */
export const useOwnCharacterAura = () => {
  const queryKey = getCharacterAurasControllerGetOwnAuraQueryKey();

  return useCharacterAurasControllerGetOwnAura({
    query: {
      queryKey,
      queryFn: async ({ signal }) =>
        (await readGameClientBootstrap<OwnCharacterAuraResponseDto>(
          queryKey,
        )) ?? characterAurasControllerGetOwnAura({ signal }),
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
  });
};
