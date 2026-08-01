import type { ErrorInfo } from "react";
import type { RootOptions } from "react-dom/client";
import type { RuntimeObserverFailure } from "@/lib/margonem-runtime/runtime.types";
import { recordPerformance } from "@/lib/performance-monitoring/performance-monitor";
import type { PerformanceDetails } from "@/lib/performance-monitoring/performance-collector";

export type LootSkipReason =
  | "empty-parsed-loots"
  | "missing-battle-warriors"
  | "missing-dialog-npc-context"
  | "missing-dialog-npc-snapshot"
  | "missing-fight-data"
  | "missing-runtime-game-snapshot";

export type LootSkipDiagnostic = {
  attemptId: string;
  battleWarriorCount?: number;
  eventNpcDelIds?: number[];
  hasFightData?: boolean;
  mapId?: number;
  mapName?: string;
  parsedLootCount?: number;
  reason: LootSkipReason;
  requestedNpcIds?: number[];
  resolvedNpcCount?: number;
  source: "dialog" | "fight";
  world?: string;
};

export type ApiActionMonitoringContext = {
  attemptId?: string;
  feature?: "loot";
  itemCount?: number;
  lootId?: number;
  lootSource?: "dialog" | "fight";
  mapName?: string;
  npcCount?: number;
  npcIds?: number[];
  npcTypes?: number[];
  playerCount?: number;
  world?: string;
};

export type FailedApiRequestDiagnostic = {
  endpoint: string;
  error: unknown;
  method: string;
  statusCode: number | null;
};

export type ApiActionFailureDiagnostic = {
  actionId: string;
  actionType: string;
  failedRequests: FailedApiRequestDiagnostic[];
  monitoringContext?: ApiActionMonitoringContext;
  requestAttemptCount: number;
  status: "error" | "partial";
};

function normalizeEndpoint(endpoint: string): string {
  const path = endpoint.split(/[?#]/, 1)[0] ?? endpoint;
  return path.replace(
    /\/(?:\d+|[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12})(?=\/|$)/gi,
    "/:id",
  );
}

function getErrorKind(error: unknown): string {
  if (error instanceof Error) return error.name;
  return typeof error;
}

function recordDiagnostic(
  name: string,
  data: Record<string, boolean | number | string | null | undefined>,
): void {
  const definedEntries = Object.entries(data).filter(
    (entry): entry is [string, boolean | number | string | null] =>
      entry[1] !== undefined,
  );
  recordPerformance({
    category: "diagnostic",
    data: Object.fromEntries(definedEntries) satisfies PerformanceDetails,
    name,
  });
}

export function getReactRootErrorHandlers(): Pick<
  RootOptions,
  "onRecoverableError" | "onUncaughtError"
> {
  return {
    onRecoverableError: (error) => {
      recordDiagnostic("error.react.recoverable", {
        errorKind: getErrorKind(error),
      });
      console.warn("[LootlogDiagnostics] recoverable React error", error);
    },
    onUncaughtError: (error) => {
      recordDiagnostic("error.react.uncaught", {
        errorKind: getErrorKind(error),
      });
      console.warn("[LootlogDiagnostics] uncaught React error", error);
    },
  };
}

export function reportLootSkipped({
  battleWarriorCount,
  eventNpcDelIds,
  hasFightData,
  parsedLootCount,
  reason,
  requestedNpcIds,
  resolvedNpcCount,
  source,
}: LootSkipDiagnostic): void {
  recordDiagnostic("loot.skipped", {
    battleWarriorCount,
    eventNpcDeletionCount: eventNpcDelIds?.length,
    hasFightData,
    parsedLootCount,
    reason,
    requestedNpcCount: requestedNpcIds?.length,
    resolvedNpcCount,
    source,
  });
  console.warn(`[LootlogDiagnostics] loot skipped: ${reason} (${source})`);
}

export function reportApiActionFailure({
  actionType,
  failedRequests,
  monitoringContext,
  requestAttemptCount,
  status,
}: ApiActionFailureDiagnostic): void {
  const primaryRequest = failedRequests.at(-1);
  if (!primaryRequest) return;

  recordDiagnostic("api.action.failure", {
    actionType,
    endpoint: normalizeEndpoint(primaryRequest.endpoint),
    failedRequestCount: failedRequests.length,
    feature: monitoringContext?.feature,
    itemCount: monitoringContext?.itemCount,
    lootSource: monitoringContext?.lootSource,
    npcCount: monitoringContext?.npcCount,
    playerCount: monitoringContext?.playerCount,
    requestAttemptCount,
    status,
    statusCode: primaryRequest.statusCode,
  });
  console.warn(
    `[LootlogDiagnostics] API action failed: ${actionType} (${status})`,
  );
}

export function captureBootstrapError(error: unknown): void {
  recordDiagnostic("error.bootstrap", { errorKind: getErrorKind(error) });
  console.warn("[LootlogDiagnostics] bootstrap error", error);
}

export function captureRuntimeObserverFailure({
  error,
  phase,
  sequence,
}: RuntimeObserverFailure): void {
  recordDiagnostic("error.runtime-observer", {
    errorKind: getErrorKind(error),
    phase,
    sequence,
  });
  console.warn(
    `[LootlogDiagnostics] ${phase} runtime observer failed at sequence ${sequence}`,
    error,
  );
}

export function captureReactError(error: unknown, errorInfo: ErrorInfo): void {
  recordDiagnostic("error.react.boundary", {
    errorKind: getErrorKind(error),
    hasComponentStack: Boolean(errorInfo.componentStack),
  });
}
