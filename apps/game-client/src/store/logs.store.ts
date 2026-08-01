import { storageKey } from "@/lib/storage-key";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";
import { create } from "zustand";

export const LOGS_STORAGE_KEY = storageKey("ll:logs:state");
export const LOGS_CAP = 200;
export const LOGS_BYTE_CAP = 5 * 1024 * 1024;

let nextLogSequence = 0;

export type LogActionType = string;
export type LogEntryStatus = "success" | "error" | "partial";
export type LogRequestStatus = "success" | "error";

type SerializablePrimitive = boolean | number | string | null;
export type SerializableValue =
  | SerializablePrimitive
  | SerializableValue[]
  | { [key: string]: SerializableValue };

export type LoggedApiRequest = {
  id: string;
  createdAt: string;
  method: string;
  endpoint: string;
  payload: SerializableValue;
  response: SerializableValue;
  statusCode: number | null;
  status: LogRequestStatus;
};

export type LoggedAction = {
  id: string;
  createdAt: string;
  actionType: LogActionType;
  status: LogEntryStatus;
  payload: SerializableValue;
  details?: SerializableValue;
  requests: LoggedApiRequest[];
};

type AppendActionInput = {
  actionType: LogActionType;
  payload: SerializableValue;
  details?: SerializableValue;
};

type UpdateActionInput = {
  actionId: string;
  status: LogEntryStatus;
  details?: SerializableValue;
};

type AppendRequestInput = {
  actionId: string;
  method: string;
  endpoint: string;
  payload: SerializableValue;
  response: SerializableValue;
  statusCode: number | null;
  status: LogRequestStatus;
};

type LogsState = {
  actions: LoggedAction[];
  appendAction: (input: AppendActionInput) => string;
  updateAction: (input: UpdateActionInput) => void;
  appendRequest: (input: AppendRequestInput) => void;
  clearActions: () => void;
};

const clearPersistedLogsStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOGS_STORAGE_KEY);
};

clearPersistedLogsStorage();

const createLogId = (): string => {
  nextLogSequence += 1;
  return `${Date.now()}-${nextLogSequence}`;
};

const textEncoder = new TextEncoder();

const getSerializedByteLength = (value: SerializableValue | LoggedAction) =>
  textEncoder.encode(JSON.stringify(value)).byteLength;

const trimActionRequestsToFit = (
  action: LoggedAction,
  byteCap: number,
): LoggedAction | null => {
  if (getSerializedByteLength(action) <= byteCap) {
    return action;
  }

  let minimumRequestIndex = 0;
  let maximumRequestIndex = action.requests.length;

  while (minimumRequestIndex < maximumRequestIndex) {
    const candidateRequestIndex = Math.floor(
      (minimumRequestIndex + maximumRequestIndex) / 2,
    );
    const candidate = {
      ...action,
      requests: action.requests.slice(candidateRequestIndex),
    };

    if (getSerializedByteLength(candidate) <= byteCap) {
      maximumRequestIndex = candidateRequestIndex;
    } else {
      minimumRequestIndex = candidateRequestIndex + 1;
    }
  }

  const trimmedAction = {
    ...action,
    requests: action.requests.slice(minimumRequestIndex),
  };

  return getSerializedByteLength(trimmedAction) <= byteCap
    ? trimmedAction
    : null;
};

const withRetentionLimits = (actions: LoggedAction[]): LoggedAction[] => {
  const countCappedActions = actions.slice(-LOGS_CAP);
  const retainedActions: LoggedAction[] = [];
  let retainedBytes = 2;

  for (let index = countCappedActions.length - 1; index >= 0; index -= 1) {
    const sourceAction = countCappedActions[index];
    if (!sourceAction) {
      continue;
    }

    const availableBytes = LOGS_BYTE_CAP - retainedBytes;
    const action =
      retainedActions.length === 0
        ? trimActionRequestsToFit(sourceAction, availableBytes)
        : sourceAction;
    if (!action) {
      return [];
    }

    const separatorBytes = retainedActions.length > 0 ? 1 : 0;
    const actionBytes = getSerializedByteLength(action);
    if (retainedBytes + separatorBytes + actionBytes > LOGS_BYTE_CAP) {
      break;
    }

    retainedActions.unshift(action);
    retainedBytes += separatorBytes + actionBytes;
  }

  return retainedActions;
};

export const useLogsStore = create<LogsState>()(
  performanceStoreMiddleware(
    "logs",
    (set) => ({
      actions: [],
      appendAction: ({ actionType, payload, details }) => {
        const actionId = createLogId();
        const action: LoggedAction = {
          id: actionId,
          createdAt: new Date().toISOString(),
          actionType,
          status: "success",
          payload,
          details,
          requests: [],
        };

        set((state) => ({
          actions: withRetentionLimits([...state.actions, action]),
        }));

        return actionId;
      },
      updateAction: ({ actionId, status, details }) => {
        set((state) => ({
          actions: withRetentionLimits(
            state.actions.map((action) => {
              if (action.id !== actionId) {
                return action;
              }

              return {
                ...action,
                status,
                details: details ?? action.details,
              };
            }),
          ),
        }));
      },
      appendRequest: ({
        actionId,
        method,
        endpoint,
        payload,
        response,
        statusCode,
        status,
      }) => {
        const request: LoggedApiRequest = {
          id: createLogId(),
          createdAt: new Date().toISOString(),
          method,
          endpoint,
          payload,
          response,
          statusCode,
          status,
        };

        set((state) => ({
          actions: withRetentionLimits(
            state.actions.map((action) => {
              if (action.id !== actionId) {
                return action;
              }

              return {
                ...action,
                requests: [...action.requests, request],
              };
            }),
          ),
        }));
      },
      clearActions: () => {
        set({ actions: [] });
      },
    }),
    (state) => state.actions.length,
  ),
);
