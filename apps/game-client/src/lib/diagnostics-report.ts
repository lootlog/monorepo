import {
  APP_ENVIRONMENT,
  BUILD_TIMESTAMP,
  COMMIT_SHA,
  GAME_CLIENT_PACKAGE_VERSION,
} from "@/config/app";
import { readLoginState } from "@/hooks/auth/use-login-state";
import type { RuntimeBridgeHealth } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { useGlobalStore } from "@/store/global.store";
import { useLogsStore } from "@/store/logs.store";

const FAILED_REQUEST_LIMIT = 5;

type DiagnosticsInput = {
  bridgeHealth: RuntimeBridgeHealth;
  failure?: string;
};

type RuntimeWindow = Window & {
  __lootlogGameClientRuntime?: { installation?: string };
};

const describeRealtime = (): string => {
  const { connected, joined, joinedGuilds } =
    useGlobalStore.getState().socketState;

  if (!connected) return "disconnected";

  return joined
    ? `joined (${joinedGuilds.length} organizations)`
    : "connected, not joined";
};

const IDENTIFIER_SEGMENT = /\d/u;

const redactPath = (path: string) =>
  path
    .split("/")
    .map((segment) => (IDENTIFIER_SEGMENT.test(segment) ? ":id" : segment))
    .join("/");

const describeEndpoint = (endpoint: string): string => {
  try {
    const url = new URL(endpoint, window.location.origin);
    const path = redactPath(url.pathname);

    return url.origin === window.location.origin ? path : `${url.host}${path}`;
  } catch {
    return redactPath(endpoint.split(/[?#]/, 1)[0] ?? "");
  }
};

const describeFailedRequests = (): string[] => {
  const failed = useLogsStore
    .getState()
    .actions.flatMap((action) =>
      action.requests
        .filter((request) => request.status === "error")
        .map((request) => ({ action: action.actionType, request })),
    )
    .sort((left, right) =>
      right.request.createdAt.localeCompare(left.request.createdAt),
    )
    .slice(0, FAILED_REQUEST_LIMIT);

  if (failed.length === 0) return ["  none"];

  return failed.map(
    ({ action, request }) =>
      `  ${request.createdAt} ${request.method} ${describeEndpoint(request.endpoint)} -> ${request.statusCode ?? "no response"} (${action})`,
  );
};

export const createDiagnosticsReport = ({
  bridgeHealth,
  failure,
}: DiagnosticsInput): string => {
  const runtimeWindow: RuntimeWindow = window;

  const installation =
    runtimeWindow.__lootlogGameClientRuntime?.installation ?? "unknown";

  const bridge = [
    `status=${bridgeHealth.status}`,
    `adapter=${bridgeHealth.adapter}`,
    `seam=${bridgeHealth.seam ?? "-"}`,
    `reason=${bridgeHealth.reason ?? "-"}`,
    `packets=${bridgeHealth.sequence}`,
    `observerFailures=${bridgeHealth.observerFailures}`,
  ].join(" ");

  return [
    "Lootlog diagnostics",
    `generated: ${new Date().toISOString()}`,
    `version: ${GAME_CLIENT_PACKAGE_VERSION || "unknown"}`,
    `commit: ${COMMIT_SHA || "unknown"}`,
    `environment: ${APP_ENVIRONMENT || "unknown"}`,
    `build: ${BUILD_TIMESTAMP || "unknown"}`,
    `installation: ${installation}`,
    `browser: ${navigator.userAgent}`,
    `page: ${window.location.host}`,
    `session: ${readLoginState()}`,
    `realtime: ${describeRealtime()}`,
    `game bridge: ${bridge}`,
    ...(failure ? [`failure: ${failure}`] : []),
    "recent failed requests:",
    ...describeFailedRequests(),
  ].join("\n");
};
