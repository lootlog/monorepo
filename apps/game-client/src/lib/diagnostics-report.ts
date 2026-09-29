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
  /** What failed, when the report accompanies a failure notice. */
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

/** Host and path only: query strings may carry identifiers. */
const describeEndpoint = (endpoint: string): string => {
  try {
    const url = new URL(endpoint, window.location.origin);

    return url.origin === window.location.origin
      ? url.pathname
      : `${url.host}${url.pathname}`;
  } catch {
    return endpoint.split(/[?#]/, 1)[0] ?? "";
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

/**
 * One plain-text bundle a player can paste into a bug report. It carries the
 * build, the installation, and the state of each connection, and deliberately
 * leaves out identities, tokens, cookies and request bodies. Keys stay in
 * English so reports read the same whatever the product language.
 */
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
