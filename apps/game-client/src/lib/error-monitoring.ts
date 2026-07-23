import * as Sentry from "@sentry/react";
import type { ErrorEvent } from "@sentry/react";
import type { ErrorInfo } from "react";
import type { RootOptions } from "react-dom/client";
import type { RuntimeObserverFailure } from "@/lib/margonem-runtime/runtime.types";

const SENTRY_APPLICATION_KEY = "lootlog-game-client";

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

let initialized = false;

const runMonitoringOperation = (operation: () => void): boolean => {
  try {
    operation();
    return true;
  } catch (error) {
    console.warn("[ErrorMonitoring] Sentry operation failed:", error);
    return false;
  }
};

const stripUrlDetails = (url: string | undefined): string | undefined => {
  if (!url) return undefined;

  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    return url.split(/[?#]/, 1)[0];
  }
};

const sanitizeEvent = (event: ErrorEvent): ErrorEvent => {
  const sanitizedUrl = stripUrlDetails(event.request?.url);
  const request = sanitizedUrl ? { url: sanitizedUrl } : undefined;
  const exception = event.exception
    ? {
        ...event.exception,
        values: event.exception.values?.map((exceptionValue) => ({
          ...exceptionValue,
          stacktrace: exceptionValue.stacktrace
            ? {
                ...exceptionValue.stacktrace,
                frames: exceptionValue.stacktrace.frames?.map((frame) => ({
                  ...frame,
                  filename: stripUrlDetails(frame.filename),
                })),
              }
            : undefined,
        })),
      }
    : undefined;

  return {
    ...event,
    exception,
    request,
    user: undefined,
  };
};

const normalizeEndpoint = (endpoint: string): string => {
  const path = endpoint.split(/[?#]/, 1)[0] ?? endpoint;
  return path.replace(
    /\/(?:\d+|[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12})(?=\/|$)/gi,
    "/:id",
  );
};

const getDiagnosticErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unknown request error";
};

const createSanitizedError = (error: unknown): Error => {
  const sanitizedError = new Error(getDiagnosticErrorMessage(error));
  if (error instanceof Error) {
    sanitizedError.name = error.name;
    sanitizedError.stack = error.stack;
  }

  return sanitizedError;
};

export const initializeErrorMonitoring = (): void => {
  if (initialized || !import.meta.env.VITE_SENTRY_DSN) {
    return;
  }

  initialized = runMonitoringOperation(() => {
    Sentry.init({
      beforeSend: sanitizeEvent,
      dataCollection: {
        cookies: false,
        genAI: { inputs: false, outputs: false },
        httpBodies: [],
        httpHeaders: { request: false, response: false },
        queryParams: false,
        stackFrameVariables: false,
        userInfo: false,
      },
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations: (defaultIntegrations) => {
        const integrations = defaultIntegrations.filter(
          (integration) => integration.name !== "Breadcrumbs",
        );

        if (import.meta.env.MODE === "development") {
          return integrations;
        }

        return [
          ...integrations,
          Sentry.thirdPartyErrorFilterIntegration({
            filterKeys: [SENTRY_APPLICATION_KEY],
            behaviour: "drop-error-if-contains-third-party-frames",
          }),
        ];
      },
      release: import.meta.env.VITE_GAME_CLIENT_VERSION,
      sendDefaultPii: false,
    });
  });
};

export const getReactRootErrorHandlers = (): Pick<
  RootOptions,
  "onRecoverableError" | "onUncaughtError"
> => {
  if (!initialized) return {};

  try {
    return {
      onRecoverableError: Sentry.reactErrorHandler(),
      onUncaughtError: Sentry.reactErrorHandler(),
    };
  } catch (error) {
    console.warn("[ErrorMonitoring] Sentry operation failed:", error);
    return {};
  }
};

export const reportLootSkipped = ({
  reason,
  source,
  ...diagnostic
}: LootSkipDiagnostic): void => {
  if (!initialized) return;

  runMonitoringOperation(() => {
    Sentry.captureMessage(`Loot creation skipped: ${reason}`, {
      extra: diagnostic,
      fingerprint: ["loot-creation-skipped", source, reason],
      level: "warning",
      tags: {
        feature: "loot",
        lootReason: reason,
        lootSource: source,
      },
    });
  });
};

export const reportApiActionFailure = ({
  actionId,
  actionType,
  failedRequests,
  monitoringContext,
  requestAttemptCount,
  status,
}: ApiActionFailureDiagnostic): void => {
  if (!initialized || failedRequests.length === 0) return;

  const requests = failedRequests.map((request) => ({
    endpoint: normalizeEndpoint(request.endpoint),
    message: getDiagnosticErrorMessage(request.error),
    method: request.method,
    statusCode: request.statusCode,
  }));
  const primaryRequest = requests.at(-1);
  const primaryFailure = failedRequests.at(-1);
  if (!primaryRequest || !primaryFailure) return;

  const statusCode = String(primaryRequest.statusCode ?? "network");
  runMonitoringOperation(() => {
    Sentry.captureException(createSanitizedError(primaryFailure.error), {
      captureContext: {
        extra: {
          actionId,
          failedRequestCount: requests.length,
          monitoringContext,
          requestAttemptCount,
          requests,
        },
        fingerprint: [
          "api-action",
          actionType,
          primaryRequest.endpoint,
          statusCode,
        ],
        level: status === "partial" ? "warning" : "error",
        tags: {
          actionStatus: status,
          actionType,
          endpoint: primaryRequest.endpoint,
          ...(monitoringContext?.feature
            ? { feature: monitoringContext.feature }
            : {}),
          statusCode,
        },
      },
    });
  });
};

export const captureBootstrapError = (error: unknown): void => {
  if (!initialized) return;

  runMonitoringOperation(() => {
    Sentry.captureException(error, {
      captureContext: {
        fingerprint: ["{{ default }}", "game-client-bootstrap"],
        tags: {
          feature: "application",
          mechanism: "bootstrap",
        },
      },
    });
  });
};

export const captureRuntimeObserverFailure = ({
  error,
  phase,
  sequence,
}: RuntimeObserverFailure): void => {
  if (import.meta.env.DEV) {
    console.warn(`[MargonemRuntimeBridge] ${phase} observer failed:`, error);
  }
  if (!initialized) return;

  runMonitoringOperation(() => {
    Sentry.captureException(createSanitizedError(error), {
      captureContext: {
        extra: { sequence },
        fingerprint: ["{{ default }}", "margonem-runtime-observer", phase],
        tags: {
          feature: "margonem-runtime",
          mechanism: "observer",
          phase,
        },
      },
    });
  });
};

export const triggerErrorMonitoringTest = (): boolean => {
  if (!initialized) return false;

  return runMonitoringOperation(() => {
    Sentry.captureException(
      new Error("Sentry game-client verification error"),
      {
        captureContext: {
          fingerprint: ["game-client-sentry-verification"],
          tags: {
            feature: "application",
            mechanism: "manual-verification",
          },
        },
      },
    );
  });
};

export const captureReactError = (
  error: unknown,
  errorInfo: ErrorInfo,
): void => {
  if (!initialized) return;

  runMonitoringOperation(() => {
    Sentry.captureReactException(error, errorInfo, {
      captureContext: {
        tags: {
          feature: "application",
          mechanism: "react-error-boundary",
        },
      },
    });
  });
};
