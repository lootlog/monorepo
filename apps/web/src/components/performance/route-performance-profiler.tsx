import { recordRouteRender } from "@/lib/performance/app-performance-metrics";
import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

type RoutePerformanceProfilerProps = {
  children: ReactNode;
  scope: "guild-route" | "user-route";
};

const handleProfilerRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  const route = id.replace(/^(guild-route|user-route):/, "");
  recordRouteRender({
    actualDuration,
    baseDuration,
    commitTime,
    id,
    phase,
    route,
    startTime,
  });
};

export const RoutePerformanceProfiler = ({
  children,
  scope,
}: RoutePerformanceProfilerProps) => {
  const location = useLocation();

  return (
    <Profiler
      id={`${scope}:${location.pathname}`}
      onRender={handleProfilerRender}
    >
      {children}
    </Profiler>
  );
};
