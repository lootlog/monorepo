import { getInitializeState } from "@/lib/game/get-initialize-state";
import { getInterfaceName } from "@/lib/game/get-interface-name";
import { getWorldName } from "@/lib/game/get-world-name";
import { useGlobalStore } from "@/store/global.store";
import { useEffect } from "react";

export const useInitialConfiguration = () => {
  const { setGameInitialized, setGameInterface, setWorld } = useGlobalStore();

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

    setWorld(world);
    setGameInterface(interfaceName);
    setGameInitialized(true);
  };

  useEffect(() => {
    init();
  }, []);
};
