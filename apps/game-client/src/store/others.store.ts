import { isDevMode } from "@/lib/is-dev-mode";
import { create } from "zustand";

export type TrackedOtherPlayer = {
  runtimeId: string;
  characterId: string;
  accountId: string;
};

export type OthersDebugLogEntry = {
  id: number;
  timestamp: string;
  source: "store" | "event" | "runtime";
  type: string;
  beforeCount: number;
  afterCount: number;
  details?: Record<string, unknown>;
};

export type OthersDebugSnapshot = {
  count: number;
  playersByRuntimeId: Record<string, TrackedOtherPlayer>;
  players: TrackedOtherPlayer[];
  debugLogs: OthersDebugLogEntry[];
};

type AppendOthersDebugLogInput = {
  source?: OthersDebugLogEntry["source"];
  type: string;
  details?: Record<string, unknown>;
  beforeCount?: number;
  afterCount?: number;
};

type OthersState = {
  playersByRuntimeId: Record<string, TrackedOtherPlayer>;
  debugLogs: OthersDebugLogEntry[];
  setPlayers: (players: TrackedOtherPlayer[]) => void;
  upsertPlayers: (players: TrackedOtherPlayer[]) => void;
  removePlayersByRuntimeIds: (runtimeIds: string[]) => void;
  clearPlayers: () => void;
  appendDebugLog: (input: AppendOthersDebugLogInput) => void;
  clearDebugLogs: () => void;
};

const MAX_DEBUG_LOGS = 200;
let debugLogId = 0;

const countPlayers = (playersByRuntimeId: Record<string, TrackedOtherPlayer>) => {
  return Object.keys(playersByRuntimeId).length;
};

const pushDebugLogEntry = (
  logs: OthersDebugLogEntry[],
  entry: Omit<OthersDebugLogEntry, "id" | "timestamp">,
): OthersDebugLogEntry[] => {
  if (!isDevMode) {
    return logs;
  }

  const nextEntry: OthersDebugLogEntry = {
    id: ++debugLogId,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  console.debug(`[others.debug] ${nextEntry.type}`, nextEntry);

  return [nextEntry, ...logs].slice(0, MAX_DEBUG_LOGS);
};

const normalizePlayers = (
  players: TrackedOtherPlayer[],
): Record<string, TrackedOtherPlayer> => {
  const normalized: Record<string, TrackedOtherPlayer> = {};

  for (const player of players) {
    if (
      !player.runtimeId ||
      !player.characterId ||
      !player.accountId
    ) {
      continue;
    }

    normalized[player.runtimeId] = player;
  }

  return normalized;
};

const normalizeRuntimeIds = (runtimeIds: string[]): string[] => {
  return Array.from(
    new Set(
      runtimeIds.filter(
        (runtimeId): runtimeId is string =>
          typeof runtimeId === "string" && runtimeId.trim().length > 0,
      ),
    ),
  );
};

export const useOthersStore = create<OthersState>((set) => ({
  playersByRuntimeId: {},
  debugLogs: [],
  setPlayers: (players) =>
    set((state) => {
      const beforeCount = countPlayers(state.playersByRuntimeId);
      const nextPlayersByRuntimeId = normalizePlayers(players);
      const afterCount = countPlayers(nextPlayersByRuntimeId);

      return {
        playersByRuntimeId: nextPlayersByRuntimeId,
        debugLogs: pushDebugLogEntry(state.debugLogs, {
          source: "store",
          type: "setPlayers",
          beforeCount,
          afterCount,
          details: {
            inputCount: players.length,
          },
        }),
      };
    }),
  upsertPlayers: (players) => {
    const normalizedPlayers = normalizePlayers(players);
    const runtimeIds = Object.keys(normalizedPlayers);

    if (runtimeIds.length === 0) {
      set((state) => {
        const count = countPlayers(state.playersByRuntimeId);

        return {
          debugLogs: pushDebugLogEntry(state.debugLogs, {
            source: "store",
            type: "upsertPlayers.noop",
            beforeCount: count,
            afterCount: count,
            details: {
              inputCount: players.length,
            },
          }),
        };
      });
      return;
    }

    set((state) => {
      const beforeCount = countPlayers(state.playersByRuntimeId);
      const nextPlayersByRuntimeId = {
        ...state.playersByRuntimeId,
        ...normalizedPlayers,
      };
      const afterCount = countPlayers(nextPlayersByRuntimeId);

      return {
        playersByRuntimeId: nextPlayersByRuntimeId,
        debugLogs: pushDebugLogEntry(state.debugLogs, {
          source: "store",
          type: "upsertPlayers",
          beforeCount,
          afterCount,
          details: {
            inputCount: players.length,
            upsertedRuntimeIds: runtimeIds,
          },
        }),
      };
    });
  },
  removePlayersByRuntimeIds: (runtimeIds) => {
    const normalizedRuntimeIds = normalizeRuntimeIds(runtimeIds);
    if (normalizedRuntimeIds.length === 0) {
      set((state) => {
        const count = countPlayers(state.playersByRuntimeId);

        return {
          debugLogs: pushDebugLogEntry(state.debugLogs, {
            source: "store",
            type: "removePlayersByRuntimeIds.noop",
            beforeCount: count,
            afterCount: count,
            details: {
              inputCount: runtimeIds.length,
            },
          }),
        };
      });
      return;
    }

    set((state) => {
      const nextPlayersByRuntimeId = { ...state.playersByRuntimeId };
      let hasChanges = false;

      for (const runtimeId of normalizedRuntimeIds) {
        if (nextPlayersByRuntimeId[runtimeId]) {
          hasChanges = true;
          delete nextPlayersByRuntimeId[runtimeId];
        }
      }

      if (!hasChanges) {
        const count = countPlayers(state.playersByRuntimeId);

        return {
          debugLogs: pushDebugLogEntry(state.debugLogs, {
            source: "store",
            type: "removePlayersByRuntimeIds.nochange",
            beforeCount: count,
            afterCount: count,
            details: {
              runtimeIds: normalizedRuntimeIds,
            },
          }),
        };
      }

      const beforeCount = countPlayers(state.playersByRuntimeId);
      const afterCount = countPlayers(nextPlayersByRuntimeId);

      return {
        playersByRuntimeId: nextPlayersByRuntimeId,
        debugLogs: pushDebugLogEntry(state.debugLogs, {
          source: "store",
          type: "removePlayersByRuntimeIds",
          beforeCount,
          afterCount,
          details: {
            runtimeIds: normalizedRuntimeIds,
          },
        }),
      };
    });
  },
  clearPlayers: () =>
    set((state) => {
      const beforeCount = countPlayers(state.playersByRuntimeId);

      return {
        playersByRuntimeId: {},
        debugLogs: pushDebugLogEntry(state.debugLogs, {
          source: "store",
          type: "clearPlayers",
          beforeCount,
          afterCount: 0,
        }),
      };
    }),
  appendDebugLog: ({ source = "event", type, details, beforeCount, afterCount }) =>
    set((state) => {
      const currentCount = countPlayers(state.playersByRuntimeId);

      return {
        debugLogs: pushDebugLogEntry(state.debugLogs, {
          source,
          type,
          beforeCount: beforeCount ?? currentCount,
          afterCount: afterCount ?? currentCount,
          details,
        }),
      };
    }),
  clearDebugLogs: () =>
    set(() => ({
      debugLogs: [],
    })),
}));

export const getOthersDebugSnapshot = (): OthersDebugSnapshot => {
  const state = useOthersStore.getState();
  const playersByRuntimeId = { ...state.playersByRuntimeId };
  const players = Object.values(playersByRuntimeId).sort((a, b) =>
    a.runtimeId.localeCompare(b.runtimeId),
  );

  return {
    count: players.length,
    playersByRuntimeId,
    players,
    debugLogs: [...state.debugLogs],
  };
};

export const dumpOthersDebugState = () => {
  const snapshot = getOthersDebugSnapshot();
  console.groupCollapsed(
    `[others.debug] snapshot | players=${snapshot.count} logs=${snapshot.debugLogs.length}`,
  );
  console.table(snapshot.players);
  console.table(snapshot.debugLogs.slice(0, 50));
  console.groupEnd();
};

const registerWindowDebugApi = () => {
  if (!isDevMode || typeof window === "undefined") {
    return;
  }

  window.__llOthersDebug = {
    getState: getOthersDebugSnapshot,
    getLogs: () => [...useOthersStore.getState().debugLogs],
    clearLogs: () => useOthersStore.getState().clearDebugLogs(),
    dump: dumpOthersDebugState,
  };
};

registerWindowDebugApi();
