import { useGlobalStore } from "@/store/global.store";

import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { useEffect, useRef } from "react";
import { installCharacterTooltipTransforms } from "@/lib/margonem-tooltips/patcher";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { runtimeStateProjection } from "@/lib/margonem-runtime/runtime-state-projection";
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

      if (!runtimeStateProjection.bootstrap()) return false;

      initialized.current = true;
      setGameState({
        gameInitialized: true,
      });

      runtimeEventPipeline.setReady(true);
      cleanupTooltipTransforms.current = installCharacterTooltipTransforms();

      return true;
    };

    runtimeEventPipeline.install();
    runtimeInteractionCoordinator.install();
    margonemRuntimeBridge.setupProxies();

    margonemRuntimeBridge.setGameInitCallback(() => {
      if (!initialized.current) {
        return checkAndInitialize();
      }

      return false;
    });
    checkAndInitialize();

    return () => {
      initialized.current = false;
      cleanupTooltipTransforms.current?.();
      cleanupTooltipTransforms.current = null;
      runtimeInteractionCoordinator.cleanup();
      runtimeEventPipeline.cleanup();
      runtimeStateProjection.cleanup();
      margonemRuntimeBridge.cleanup();
    };
  }, [setGameState]);
};
