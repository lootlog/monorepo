import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { recordPerformance } from "./performance-monitor";

type PerformanceProfilerProps = {
  children: ReactNode;
  id: string;
};

export const recordReactProfilerCommit: ProfilerOnRenderCallback = (
  profilerId,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  recordPerformance({
    category: "react",
    data: {
      baseDurationMs: baseDuration,
      commitTimeMs: commitTime,
      phase,
      startTimeMs: startTime,
    },
    durationMs: actualDuration,
    name: `react.commit.${profilerId}`,
  });
};

export function PerformanceProfiler({
  children,
  id,
}: PerformanceProfilerProps) {
  if (import.meta.env.VITE_GAME_CLIENT_PERFORMANCE_MONITORING !== "1") {
    return children;
  }

  return (
    <Profiler id={id} onRender={recordReactProfilerCommit}>
      {children}
    </Profiler>
  );
}
