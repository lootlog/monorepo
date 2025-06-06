import { getAccountId } from "@/lib/game/get-account-id";
import { getCharacterId } from "@/lib/game/get-character-id";
import { getInitializeState } from "@/lib/game/get-initialize-state";
import { getInterfaceName } from "@/lib/game/get-interface-name";
import { getWorldName } from "@/lib/game/get-world-name";
import { useGlobalStore } from "@/store/global.store";
import { useEffect } from "react";

export const useInitialConfiguration = () => {
  const { setGameState } = useGlobalStore();

  const init = async () => {
    const started = typeof window._g == "function";
    if (!started) {
      setTimeout(init, 500);
      return;
    }

    const interfaceName = getInterfaceName();
    const initialized = getInitializeState(interfaceName);

    if (!initialized) {
      setTimeout(init, 500);
      return;
    }

    const world = getWorldName(interfaceName);
    const accountId = getAccountId(interfaceName);
    const characterId = getCharacterId(interfaceName);

    setGameState({
      gameInitialized: true,
      gameInterface: interfaceName,
      world,
      accountId,
      characterId,
    });
  };

  useEffect(() => {
    init();
  }, []);
};
