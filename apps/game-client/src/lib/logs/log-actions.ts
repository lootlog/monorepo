import {
  useLogsStore,
  type LogActionType,
  type LogEntryStatus,
  type SerializableValue,
} from "@/store/logs.store";
import { getFixedT } from "@/i18n/get-fixed-t";

type RecordValue = Record<string, unknown>;

type StartLoggedActionInput = {
  actionType: LogActionType;
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
  retry?: LoggedActionRetryOptions;
};

const isRecord = (value: unknown): value is RecordValue => {
  return typeof value === "object" && value !== null;
};

export const serializeLogValue = (value: unknown): SerializableValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeLogValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeLogValue(nestedValue),
      ]),
    );
  }

  return String(value);
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
  payload,
  details,
}: StartLoggedActionInput): LoggedActionController => {
  const actionId = useLogsStore.getState().appendAction({
    actionType,
    payload: serializeLogValue(payload),
    details: details ? serializeLogValue(details) : undefined,
  });

  return {
    actionId,
    actionType,
    complete: ({ status, details: nextDetails }) => {
      useLogsStore.getState().updateAction({
        actionId,
        status,
        details: nextDetails ? serializeLogValue(nextDetails) : undefined,
      });
    },
    logRequestSuccess: ({
      method,
      endpoint,
      payload: requestPayload,
      response,
      statusCode,
    }) => {
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
  retry,
}: RunSingleLoggedActionInput<TResponse>): Promise<TResponse> => {
  const action = startLoggedAction({
    actionType,
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
