import {
  characterAurasControllerGetOwnAura,
  getCharacterAurasControllerGetOwnAuraQueryKey,
  useCharacterAurasControllerGetOwnAura,
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
        (await readGameClientBootstrap("characterAura", queryKey)) ??
        characterAurasControllerGetOwnAura({ signal }),
      refetchOnWindowFocus: false,
      refetchOnMount,
      staleTime: Infinity,
    },
  });
};
