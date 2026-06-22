import { recordRouteRender } from "@/lib/performance/app-performance-metrics";
import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

type UserRoutePerformanceProfilerProps = {
  children: ReactNode;
};

const handleProfilerRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  const route = id.replace("user-route:", "");
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

export const UserRoutePerformanceProfiler = ({
  children,
}: UserRoutePerformanceProfilerProps) => {
  const location = useLocation();

  return (
    <Profiler
      id={`user-route:${location.pathname}`}
      onRender={handleProfilerRender}
    >
      {children}
    </Profiler>
  );
};
