import { useEffect, useState } from "react";

type NoticePresenceOptions = {
  minVisibleMs?: number;
  exitMs?: number;
};

type NoticePhase = "hidden" | "shown" | "leaving";

const DEFAULT_MIN_VISIBLE_MS = 800;

const DEFAULT_EXIT_MS = 160;

export const useNoticePresence = (
  active: boolean,
  {
    minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
    exitMs = DEFAULT_EXIT_MS,
  }: NoticePresenceOptions = {},
) => {
  const [presence, setPresence] = useState<{
    phase: NoticePhase;
    shownAt: number;
  }>({ phase: active ? "shown" : "hidden", shownAt: 0 });

  useEffect(() => {
    const { phase, shownAt } = presence;

    if (active) {
      if (phase === "shown") return;

      const timeoutId = window.setTimeout(
        () =>
          setPresence({
            phase: "shown",
            shownAt: phase === "leaving" ? shownAt : Date.now(),
          }),
        0,
      );

      return () => window.clearTimeout(timeoutId);
    }

    if (phase === "hidden") return;

    const timeoutId = window.setTimeout(
      () =>
        setPresence({
          phase: phase === "shown" ? "leaving" : "hidden",
          shownAt,
        }),
      phase === "shown"
        ? Math.max(0, shownAt + minVisibleMs - Date.now())
        : exitMs,
    );

    return () => window.clearTimeout(timeoutId);
  }, [active, exitMs, minVisibleMs, presence]);

  return {
    mounted: presence.phase !== "hidden",
    leaving: presence.phase === "leaving",
  };
};
