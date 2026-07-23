import { useGlobalStore } from "@/store/global.store";

import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { useEffect, useRef } from "react";
import { installCharacterTooltipTransforms } from "@/lib/margonem-tooltips/patcher";
import { runtimeStateSynchronizer } from "@/lib/margonem-runtime/runtime-state-synchronizer";
import { runtimeInteractionCoordinator } from "@/lib/margonem-runtime/runtime-interaction-coordinator";
import { isMargonemRuntimeReady } from "@/lib/margonem-runtime/runtime-adapter";

export const useInit = () => {
  const setGameState = useGlobalStore((state) => state.setGameState);
  const initialized = useRef(false);
  const cleanupTooltipTransforms = useRef<(() => void) | null>(null);

  useEffect(() => {
    const checkAndInitialize = () => {
      if (initialized.current) {
        return false;
      }

      const isGameLoaded = isMargonemRuntimeReady();
      if (!isGameLoaded) {
        return false;
      }

      initialized.current = true;

      setGameState({
        gameInitialized: true,
      });

      runtimeStateSynchronizer.bootstrap();
      margonemRuntimeBridge.bootstrap();
      margonemRuntimeBridge.setReady(true);
      cleanupTooltipTransforms.current = installCharacterTooltipTransforms();

      return true;
    };

    runtimeStateSynchronizer.install();
    runtimeInteractionCoordinator.install();
    margonemRuntimeBridge.setupProxies();

    margonemRuntimeBridge.setGameInitCallback(() => {
      if (!initialized.current) {
        return checkAndInitialize();
      }

      return false;
    });

    return () => {
      cleanupTooltipTransforms.current?.();
      cleanupTooltipTransforms.current = null;
      runtimeInteractionCoordinator.cleanup();
      runtimeStateSynchronizer.cleanup();
      margonemRuntimeBridge.cleanup();
    };
  }, [setGameState]);
};
