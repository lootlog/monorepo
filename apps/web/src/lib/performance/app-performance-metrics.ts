type ApiRequestMetric = {
  durationMs: number;
  endedAt: number;
  errorMessage?: string;
  method: string;
  path: string;
  route: string;
  status: "error" | "success";
  statusCode?: number;
  url: string;
};

type RenderMetric = {
  actualDuration: number;
  baseDuration: number;
  commitTime: number;
  id: string;
  phase: "mount" | "nested-update" | "update";
  route: string;
  startTime: number;
};

type AppPerformanceState = {
  requests: ApiRequestMetric[];
  renders: RenderMetric[];
};

declare global {
  interface Window {
    __LOOTLOG_PERF__?: AppPerformanceState;
  }
}

const MAX_METRICS = 2_000;
const isPerformanceMetricsEnabled = () =>
  import.meta.env.DEV && typeof window !== "undefined";

const syncPerformanceDataset = (state: AppPerformanceState) => {
  document.documentElement.dataset.lootlogPerf = JSON.stringify(state);
};

const getPerformanceState = () => {
  if (!isPerformanceMetricsEnabled()) {
    return null;
  }

  window.__LOOTLOG_PERF__ ??= {
    requests: [],
    renders: [],
  };
  syncPerformanceDataset(window.__LOOTLOG_PERF__);

  return window.__LOOTLOG_PERF__;
};

const trimMetrics = <T>(metrics: T[]) => {
  if (metrics.length <= MAX_METRICS) {
    return;
  }

  metrics.splice(0, metrics.length - MAX_METRICS);
};

const getCurrentRoute = () =>
  typeof window === "undefined" ? "" : window.location.pathname;

const getRequestPath = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return url;
  }
};

const getErrorMetadata = (error: unknown) => {
  if (!(error instanceof Error)) {
    return {};
  }

  return {
    errorMessage: error.message,
    statusCode:
      "status" in error && typeof error.status === "number"
        ? error.status
        : undefined,
  };
};

export const resetAppPerformanceMetrics = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.__LOOTLOG_PERF__ = {
    requests: [],
    renders: [],
  };
  syncPerformanceDataset(window.__LOOTLOG_PERF__);
};

export const recordRouteRender = (metric: RenderMetric) => {
  const state = getPerformanceState();
  if (!state) {
    return;
  }

  state.renders.push(metric);
  trimMetrics(state.renders);
  syncPerformanceDataset(state);
};

export const recordApiRequest = async <TData>(
  {
    method,
    url,
  }: {
    method: string;
    url: string;
  },
  execute: () => Promise<TData>,
) => {
  const state = getPerformanceState();
  if (!state) {
    return execute();
  }

  const startedAt = performance.now();

  try {
    const data = await execute();
    state.requests.push({
      durationMs: performance.now() - startedAt,
      endedAt: performance.now(),
      method,
      path: getRequestPath(url),
      route: getCurrentRoute(),
      status: "success",
      url,
    });
    trimMetrics(state.requests);
    syncPerformanceDataset(state);
    return data;
  } catch (error) {
    const errorMetadata = getErrorMetadata(error);

    state.requests.push({
      durationMs: performance.now() - startedAt,
      endedAt: performance.now(),
      ...errorMetadata,
      method,
      path: getRequestPath(url),
      route: getCurrentRoute(),
      status: "error",
      url,
    });
    trimMetrics(state.requests);
    syncPerformanceDataset(state);
    throw error;
  }
};
