import {
  characterAurasControllerGetOwnAura,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  useCharacterAurasControllerGetOwnAura,
  type OwnCharacterAuraResponseDto,
} from "@lootlog/client/main";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";

/**
 * The aura the signed-in User wears and whether they may choose one. Access
 * changes when an admin grants or revokes it, so the aura settings read it
 * afresh with `refetchOnMount: "always"`.
 */
export const useOwnCharacterAura = ({
  refetchOnMount,
}: { refetchOnMount?: "always" } = {}) => {
  const queryKey = getCharacterAurasControllerGetOwnAuraQueryKey();

  return useCharacterAurasControllerGetOwnAura({
    query: {
      queryKey,
      queryFn: async ({ signal }) =>
        (await readGameClientBootstrap<OwnCharacterAuraResponseDto>(
          queryKey,
        )) ?? characterAurasControllerGetOwnAura({ signal }),
      refetchOnWindowFocus: false,
      refetchOnMount,
      staleTime: Infinity,
    },
  });
};
