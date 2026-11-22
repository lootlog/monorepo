import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

const IDLE_TIMEOUT_MS = 4000;

const prefersReducedData = () =>
  "connection" in navigator &&
  // SAFETY: NetworkInformation is not in lib.dom; only the boolean is read.
  (navigator.connection as { saveData?: boolean } | undefined)?.saveData ===
    true;

const whenIdle = (callback: () => void) => {
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(callback, {
      timeout: IDLE_TIMEOUT_MS,
    });

    return () => window.cancelIdleCallback(handle);
  }

  const handle = setTimeout(callback, IDLE_TIMEOUT_MS);

  return () => clearTimeout(handle);
};

export function useWarmRouteChunks(paths: readonly string[]) {
  const router = useRouter();
  const pathsKey = paths.join("\n");

  useEffect(() => {
    if (!pathsKey || prefersReducedData()) return;

    return whenIdle(() => {
      for (const path of pathsKey.split("\n")) {
        const [matchedRoutes] = router.getMatchedRoutes(path);

        for (const route of matchedRoutes) {
          void router.loadRouteChunk(route)?.catch(() => undefined);
        }
      }
    });
  }, [pathsKey, router]);
}
