import {
  useLogsStore,
  type LogActionType,
  type LogEntryStatus,
  type SerializableValue,
} from "@/store/logs.store";
import { getFixedT } from "@/i18n/get-fixed-t";
import {
  reportApiActionFailure,
  type ApiActionMonitoringContext,
  type FailedApiRequestDiagnostic,
} from "@/lib/error-monitoring";

type RecordValue = Record<string, unknown>;

export const LOG_VALUE_BYTE_CAP = 256 * 1024;
export const LOG_VALUE_MAX_DEPTH = 10;
export const LOG_VALUE_MAX_ARRAY_ITEMS = 1_000;
export const LOG_VALUE_MAX_STRING_BYTES = 16 * 1024;

type SerializationContext = {
  bytes: number;
  ancestors: WeakSet<object>;
};

class LogValueBudgetExceeded extends Error {}

const textEncoder = new TextEncoder();

type StartLoggedActionInput = {
  actionType: LogActionType;
  monitoringContext?: ApiActionMonitoringContext;
  payload: unknown;
  details?: unknown;
};

type CompleteLoggedActionInput = {
  status: LogEntryStatus;
  details?: unknown;
};

type LoggedRequestInput = {
  method: string;
  endpoint: string;
  payload: unknown;
};

type LoggedRequestSuccessInput = LoggedRequestInput & {
  response: unknown;
  statusCode: number | null;
};

type LoggedRequestErrorInput = LoggedRequestInput & {
  error: unknown;
};

export type LoggedActionController = {
  actionId: string;
  actionType: LogActionType;
  complete: (input: CompleteLoggedActionInput) => void;
  logRequestSuccess: (input: LoggedRequestSuccessInput) => void;
  logRequestError: (input: LoggedRequestErrorInput) => void;
};

type RunLoggedRequestInput<TResponse> = LoggedRequestInput & {
  action: LoggedActionController;
  request: () => Promise<TResponse>;
};

export type LoggedActionRetryOptions = {
  maxAttempts: number;
  retryableStatuses: readonly number[];
  getDelayMs: (attempt: number, error: unknown) => number;
};

type RunSingleLoggedActionInput<TResponse> = {
  actionType: LogActionType;
  actionPayload: unknown;
  request: LoggedRequestInput;
  execute: () => Promise<TResponse>;
  getSuccessDetails?: (response: TResponse) => unknown;
  getErrorDetails?: (error: unknown) => unknown;
  monitoringContext?: ApiActionMonitoringContext;
  retry?: LoggedActionRetryOptions;
};

const isRecord = (value: unknown): value is RecordValue => {
  return typeof value === "object" && value !== null;
};

const getUtf8ByteLength = (value: string): number =>
  textEncoder.encode(value).byteLength;

const consumeSerializationBudget = (
  context: SerializationContext,
  bytes: number,
): void => {
  if (context.bytes + bytes > LOG_VALUE_BYTE_CAP) {
    throw new LogValueBudgetExceeded();
  }

  context.bytes += bytes;
};

const createTruncatedValue = (
  reason: string,
  metadata: Record<string, SerializableValue> = {},
): SerializableValue => ({
  truncated: true,
  reason,
  ...metadata,
});

const serializeTruncationMarker = (
  context: SerializationContext,
  reason: string,
  metadata?: Record<string, SerializableValue>,
): SerializableValue => {
  const marker = createTruncatedValue(reason, metadata);
  consumeSerializationBudget(
    context,
    getUtf8ByteLength(JSON.stringify(marker)),
  );
  return marker;
};

const serializeLogValueWithinBudget = (
  value: unknown,
  context: SerializationContext,
  depth: number,
): SerializableValue => {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    consumeSerializationBudget(
      context,
      getUtf8ByteLength(JSON.stringify(value)),
    );
    return value;
  }

  if (typeof value === "string") {
    const valueBytes = getUtf8ByteLength(value);
    if (valueBytes > LOG_VALUE_MAX_STRING_BYTES) {
      return serializeTruncationMarker(context, "max-string-bytes", {
        originalBytes: valueBytes,
      });
    }

    consumeSerializationBudget(
      context,
      getUtf8ByteLength(JSON.stringify(value)),
    );
    return value;
  }

  if (value instanceof Date) {
    const serializedDate = value.toISOString();
    consumeSerializationBudget(
      context,
      getUtf8ByteLength(JSON.stringify(serializedDate)),
    );
    return serializedDate;
  }

  if (depth >= LOG_VALUE_MAX_DEPTH && isRecord(value)) {
    return serializeTruncationMarker(context, "max-depth");
  }

  if (Array.isArray(value)) {
    if (context.ancestors.has(value)) {
      return serializeTruncationMarker(context, "circular-reference");
    }

    context.ancestors.add(value);
    consumeSerializationBudget(context, 2);

    const hasOverflow = value.length > LOG_VALUE_MAX_ARRAY_ITEMS;
    const itemLimit = hasOverflow
      ? LOG_VALUE_MAX_ARRAY_ITEMS - 1
      : value.length;
    const serializedItems: SerializableValue[] = [];

    try {
      for (let index = 0; index < itemLimit; index += 1) {
        if (index > 0) {
          consumeSerializationBudget(context, 1);
        }
        serializedItems.push(
          serializeLogValueWithinBudget(value[index], context, depth + 1),
        );
      }

      if (hasOverflow) {
        if (serializedItems.length > 0) {
          consumeSerializationBudget(context, 1);
        }
        serializedItems.push(
          serializeTruncationMarker(context, "max-array-items", {
            originalLength: value.length,
          }),
        );
      }
    } finally {
      context.ancestors.delete(value);
    }

    return serializedItems;
  }

  if (isRecord(value)) {
    if (context.ancestors.has(value)) {
      return serializeTruncationMarker(context, "circular-reference");
    }

    context.ancestors.add(value);
    consumeSerializationBudget(context, 2);
    const serializedRecord: Record<string, SerializableValue> = {};

    try {
      for (const [index, [key, nestedValue]] of Object.entries(
        value,
      ).entries()) {
        if (index > 0) {
          consumeSerializationBudget(context, 1);
        }
        consumeSerializationBudget(
          context,
          getUtf8ByteLength(JSON.stringify(key)) + 1,
        );
        serializedRecord[key] = serializeLogValueWithinBudget(
          nestedValue,
          context,
          depth + 1,
        );
      }
    } finally {
      context.ancestors.delete(value);
    }

    return serializedRecord;
  }

  return serializeLogValueWithinBudget(String(value), context, depth);
};

export const serializeLogValue = (value: unknown): SerializableValue => {
  try {
    return serializeLogValueWithinBudget(
      value,
      { bytes: 0, ancestors: new WeakSet() },
      0,
    );
  } catch (error) {
    if (!(error instanceof LogValueBudgetExceeded)) {
      throw error;
    }

    return createTruncatedValue("max-bytes", {
      limitBytes: LOG_VALUE_BYTE_CAP,
    });
  }
};

const getResponseStatusCode = (response: unknown): number | null => {
  if (!isRecord(response) || typeof response.status !== "number") {
    return null;
  }

  return response.status;
};

const getResponseBody = (response: unknown): unknown => {
  if (!isRecord(response) || !("data" in response)) {
    return response ?? null;
  }

  return response.data ?? null;
};

const getErrorStatusCode = (error: unknown): number | null => {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.status === "number") {
    return error.status;
  }

  if (!isRecord(error.response)) {
    return null;
  }

  return typeof error.response.status === "number"
    ? error.response.status
    : null;
};

const getLoggableErrorResponse = (error: unknown): SerializableValue => {
  const t = getFixedT("common");

  if (isRecord(error) && ("status" in error || "data" in error)) {
    return serializeLogValue({
      message:
        typeof error.message === "string"
          ? error.message
          : t("errors.requestFailed"),
      data: "data" in error ? (error.data ?? null) : null,
    });
  }

  if (isRecord(error) && isRecord(error.response)) {
    return serializeLogValue({
      message:
        typeof error.message === "string"
          ? error.message
          : t("errors.requestFailed"),
      data: "data" in error.response ? (error.response.data ?? null) : null,
    });
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return serializeLogValue(error);
};

export const getErrorMessage = (error: unknown): string => {
  const t = getFixedT("common");

  if (isRecord(error) && isRecord(error.data)) {
    const responseData = error.data;

    if (typeof responseData.message === "string") {
      return responseData.message;
    }
  }

  if (isRecord(error) && isRecord(error.response)) {
    const responseData = error.response.data;

    if (isRecord(responseData) && typeof responseData.message === "string") {
      return responseData.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t("errors.unknown");
};

export const getAggregateActionStatus = (
  successCount: number,
  failureCount: number,
): LogEntryStatus => {
  if (successCount > 0 && failureCount > 0) {
    return "partial";
  }

  if (failureCount > 0) {
    return "error";
  }

  return "success";
};

export const startLoggedAction = ({
  actionType,
  monitoringContext,
  payload,
  details,
}: StartLoggedActionInput): LoggedActionController => {
  const actionId = useLogsStore.getState().appendAction({
    actionType,
    payload: serializeLogValue(payload),
    details: details ? serializeLogValue(details) : undefined,
  });
  const failedRequests: FailedApiRequestDiagnostic[] = [];
  let requestAttemptCount = 0;

  return {
    actionId,
    actionType,
    complete: ({ status, details: nextDetails }) => {
      useLogsStore.getState().updateAction({
        actionId,
        status,
        details: nextDetails ? serializeLogValue(nextDetails) : undefined,
      });
      if (status === "error" || status === "partial") {
        reportApiActionFailure({
          actionId,
          actionType,
          failedRequests,
          monitoringContext,
          requestAttemptCount,
          status,
        });
      }
    },
    logRequestSuccess: ({
      method,
      endpoint,
      payload: requestPayload,
      response,
      statusCode,
    }) => {
      requestAttemptCount += 1;
      useLogsStore.getState().appendRequest({
        actionId,
        method,
        endpoint,
        payload: serializeLogValue(requestPayload),
        response: serializeLogValue(response),
        statusCode,
        status: "success",
      });
    },
    logRequestError: ({ method, endpoint, payload: requestPayload, error }) => {
      requestAttemptCount += 1;
      failedRequests.push({
        endpoint,
        error,
        method,
        statusCode: getErrorStatusCode(error),
      });
      useLogsStore.getState().appendRequest({
        actionId,
        method,
        endpoint,
        payload: serializeLogValue(requestPayload),
        response: getLoggableErrorResponse(error),
        statusCode: getErrorStatusCode(error),
        status: "error",
      });
    },
  };
};

export const runLoggedRequest = async <TResponse>({
  action,
  method,
  endpoint,
  payload,
  request,
}: RunLoggedRequestInput<TResponse>): Promise<TResponse> => {
  try {
    const response = await request();

    action.logRequestSuccess({
      method,
      endpoint,
      payload,
      response: getResponseBody(response),
      statusCode: getResponseStatusCode(response),
    });

    return response;
  } catch (error) {
    action.logRequestError({
      method,
      endpoint,
      payload,
      error,
    });

    throw error;
  }
};

const delayRetry = (delayMs: number): Promise<void> => {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
};

const shouldRetryLoggedActionError = (
  error: unknown,
  retry: LoggedActionRetryOptions,
): boolean => {
  const statusCode = getErrorStatusCode(error);

  if (statusCode === null) {
    return true;
  }

  return retry.retryableStatuses.includes(statusCode);
};

const runLoggedRequestWithRetry = <TResponse>({
  action,
  method,
  endpoint,
  payload,
  request,
  retry,
}: RunLoggedRequestInput<TResponse> & {
  retry?: LoggedActionRetryOptions;
}): Promise<TResponse> => {
  const maxAttempts = Math.max(1, retry?.maxAttempts ?? 1);

  const runAttempt = async (attempt: number): Promise<TResponse> => {
    try {
      return await runLoggedRequest({
        action,
        method,
        endpoint,
        payload,
        request,
      });
    } catch (error) {
      const canRetry =
        retry &&
        attempt < maxAttempts &&
        shouldRetryLoggedActionError(error, retry);

      if (!canRetry) {
        throw error;
      }

      await delayRetry(retry.getDelayMs(attempt, error));
      return runAttempt(attempt + 1);
    }
  };

  return runAttempt(1);
};

export const runSingleLoggedAction = async <TResponse>({
  actionType,
  actionPayload,
  request,
  execute,
  getSuccessDetails,
  getErrorDetails,
  monitoringContext,
  retry,
}: RunSingleLoggedActionInput<TResponse>): Promise<TResponse> => {
  const action = startLoggedAction({
    actionType,
    monitoringContext,
    payload: actionPayload,
  });

  try {
    const response = await runLoggedRequestWithRetry({
      action,
      method: request.method,
      endpoint: request.endpoint,
      payload: request.payload,
      request: execute,
      retry,
    });

    action.complete({
      status: "success",
      details: getSuccessDetails?.(response),
    });

    return response;
  } catch (error) {
    action.complete({
      status: "error",
      details: getErrorDetails?.(error),
    });

    throw error;
  }
};
