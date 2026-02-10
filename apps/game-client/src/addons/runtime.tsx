import { LOADED_ADDONS } from "@/addons/loader";
import { loadRuntimeAddons } from "@/addons/remote-loader";
import { createAddonSetupContext } from "@/addons/sdk";
import { isAddonEnabled, useAddonsStore } from "@/addons/state";
import type { GameClientAddon } from "@/addons/types";
import { useRuntimeUserAddons } from "@/hooks/api/use-runtime-user-addons";
import { useGlobalStore } from "@/store/global.store";
import { useMemo, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

const sortAddons = (addons: GameClientAddon[]) => {
  return [...addons].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.id.localeCompare(b.id);
  });
};

const mergeLocalAndRemoteAddons = (remoteAddons: GameClientAddon[]) => {
  const localAddonIds = new Set(LOADED_ADDONS.map((addon) => addon.id));
  const uniqueRemoteAddons = remoteAddons.filter((addon) => {
    if (localAddonIds.has(addon.id)) {
      console.warn(
        `[addons] Runtime addon "${addon.id}" conflicts with local addon id. Skipping runtime addon.`,
      );
      return false;
    }

    return true;
  });

  return sortAddons([...LOADED_ADDONS, ...uniqueRemoteAddons]);
};

const RuntimeAddonMount = ({
  addon,
  enabled,
  gameInitialized,
}: {
  addon: GameClientAddon;
  enabled: boolean;
  gameInitialized: boolean;
}) => {
  const hasMount = "Mount" in addon && typeof addon.Mount === "function";

  useEffect(() => {
    if (hasMount || !enabled || !gameInitialized || !("setup" in addon)) {
      return;
    }

    const cleanup = addon.setup(createAddonSetupContext(addon.id));
    if (typeof cleanup === "function") {
      return cleanup;
    }
  }, [addon, enabled, gameInitialized, hasMount]);

  if (hasMount) {
    const Mount = addon.Mount;
    return <Mount enabled={enabled} gameInitialized={gameInitialized} />;
  }

  return null;
};

export const AddonsRuntime = () => {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const disabledAddonIds = useAddonsStore((s) => s.disabledAddonIds);
  const { data: remoteRuntimeAddons = [] } = useRuntimeUserAddons();

  const runtimeAddons = useMemo(
    () => loadRuntimeAddons(remoteRuntimeAddons),
    [remoteRuntimeAddons],
  );
  const loadedAddons = useMemo(
    () => mergeLocalAndRemoteAddons(runtimeAddons),
    [runtimeAddons],
  );

  return (
    <>
      {loadedAddons.map((addon) => {
        const enabled = isAddonEnabled(addon, disabledAddonIds);

        return (
          <ErrorBoundary key={addon.id} fallback={null}>
            <RuntimeAddonMount
              addon={addon}
              enabled={enabled}
              gameInitialized={gameInitialized}
            />
          </ErrorBoundary>
        );
      })}
    </>
  );
};
