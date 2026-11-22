import {
  characterAurasControllerGetOwnAura,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  useCharacterAurasControllerGetOwnAura,
  type OwnCharacterAuraResponseDto,
} from "@lootlog/client/main";
import { readGameClientBootstrap } from "@/lib/game-client-bootstrap";

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
