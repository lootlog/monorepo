type ScriptTiming = PerformanceEntry & {
  invoker: string;
  sourceFunctionName: string;
  sourceURL: string;
  sourceCharPosition: number;
};

type LongAnimationFrameTiming = PerformanceEntry & {
  blockingDuration: number;
  scripts: readonly ScriptTiming[];
};

const REPORTED_SCRIPT_MS = 50;

export function monitorLongFrames(): () => void {
  if (!PerformanceObserver.supportedEntryTypes.includes("long-animation-frame"))
    return () => {};

  const ownOrigin = new URL(import.meta.url).origin;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // SAFETY: the observer only receives the "long-animation-frame" entries
      // it subscribed to.
      const frame = entry as LongAnimationFrameTiming;

      const ownScripts = frame.scripts.filter((script) =>
        script.sourceURL.startsWith(ownOrigin),
      );

      const ownDuration = ownScripts.reduce(
        (sum, script) => sum + script.duration,
        0,
      );

      if (ownDuration < REPORTED_SCRIPT_MS) continue;

      console.warn(
        `[lootlog] long frame: ${Math.round(ownDuration)} ms of ${Math.round(frame.duration)} ms in Lootlog scripts`,
        ownScripts.map((script) => ({
          duration: Math.round(script.duration),
          invoker: script.invoker,
          source: `${script.sourceFunctionName || "(anonymous)"} ${script.sourceURL}:${script.sourceCharPosition}`,
        })),
      );
    }
  });

  observer.observe({ type: "long-animation-frame", buffered: true });

  return () => observer.disconnect();
}
