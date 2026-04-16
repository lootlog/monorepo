import { storageKey } from "@/lib/storage-key";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const LOGS_STORAGE_KEY = storageKey("ll:logs:state");
export const LOGS_CAP = 200;

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

const createLogId = (): string => {
  nextLogSequence += 1;
  return `${Date.now()}-${nextLogSequence}`;
};

const withCap = (actions: LoggedAction[]): LoggedAction[] => {
  if (actions.length <= LOGS_CAP) {
    return actions;
  }

  return actions.slice(-LOGS_CAP);
};

export const useLogsStore = create<LogsState>()(
  persist(
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
          actions: withCap([...state.actions, action]),
        }));

        return actionId;
      },
      updateAction: ({ actionId, status, details }) => {
        set((state) => ({
          actions: state.actions.map((action) => {
            if (action.id !== actionId) {
              return action;
            }

            return {
              ...action,
              status,
              details: details ?? action.details,
            };
          }),
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
          actions: state.actions.map((action) => {
            if (action.id !== actionId) {
              return action;
            }

            return {
              ...action,
              requests: [...action.requests, request],
            };
          }),
        }));
      },
      clearActions: () => {
        set({ actions: [] });
      },
    }),
    {
      name: LOGS_STORAGE_KEY,
      partialize: (state) => ({
        actions: state.actions,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, version) => {
        if (version >= 2) {
          return persistedState as { actions: LoggedAction[] };
        }

        return {
          actions: [],
        };
      },
    },
  ),
);
