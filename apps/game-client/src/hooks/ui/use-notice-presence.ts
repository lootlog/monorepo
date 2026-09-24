import { useEffect, useState } from "react";

type NoticePresenceOptions = {
  /** How long a condition must last before the notice appears. */
  enterDelayMs: number;
  /** How long an appeared notice stays, so it never blinks in and out. */
  minVisibleMs?: number;
  /** How long the leave animation runs before the notice unmounts. */
  exitMs?: number;
};

type NoticePhase = "hidden" | "shown" | "leaving";

const DEFAULT_MIN_VISIBLE_MS = 800;

const DEFAULT_EXIT_MS = 160;

/**
 * Mount state for a status notice. A condition that clears before
 * `enterDelayMs` never shows, one that appeared stays for `minVisibleMs`, and
 * a leaving notice gets `exitMs` to animate out before it unmounts. A
 * condition that returns while the notice leaves keeps it on screen.
 */
export const useNoticePresence = (
  active: boolean,
  {
    enterDelayMs,
    minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
    exitMs = DEFAULT_EXIT_MS,
  }: NoticePresenceOptions,
) => {
  const [presence, setPresence] = useState<{
    phase: NoticePhase;
    shownAt: number;
  }>({ phase: "hidden", shownAt: 0 });

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
        phase === "leaving" ? 0 : enterDelayMs,
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
  }, [active, enterDelayMs, exitMs, minVisibleMs, presence]);

  return {
    mounted: presence.phase !== "hidden",
    leaving: presence.phase === "leaving",
  };
};
