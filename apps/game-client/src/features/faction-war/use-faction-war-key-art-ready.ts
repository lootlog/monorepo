import { useEffect, useState } from "react";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import { PICK_SCREEN_FACTIONS } from "./faction-war-presentation";

/** The stage fades in once its key art decoded, or after this at the latest. */
const READY_TIMEOUT_MS = 1_200;

/** Whether both halves' backdrop and character art are ready to show. */
export const useFactionWarKeyArtReady = (warId: string) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const sources = PICK_SCREEN_FACTIONS.flatMap((faction) => [
      getFactionWarAssetUrl(warId, faction, "backdrop"),
      getFactionWarAssetUrl(warId, faction, "character"),
    ]).filter((source) => source !== null);

    const decodes = sources.map((source) => {
      const image = new Image();
      image.src = source;

      return image.decode().catch(() => undefined);
    });

    const timeout = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, READY_TIMEOUT_MS);

    void Promise.all(decodes).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [warId]);

  return ready;
};
