import {
  collectLeafPaths,
  pathsOverlap,
  setPath,
  unsetPath,
} from "@lootlog/domain/settings-paths";
import { groupBy, isEqual } from "es-toolkit";
import type { QueryKey } from "@tanstack/react-query";
import type { SettingsOperation } from "./settings-documents";
import type { SettingsSaveStatus } from "./settings-save-status.store";

export type QueuedSettingsPatch = {
  operation: SettingsOperation;
  /** Cache entries this operation belongs to (optimistic update + reconcile). */
  queryKeys: QueryKey[];
  /** Extra work after the server accepted the patch (e.g. invalidate lists). */
  afterSave?: () => void;
};

export type SettingsPatchQueueConfig<TResponse = unknown> = {
  send: (operations: SettingsOperation[]) => Promise<TResponse>;
  applyOptimistic: (patch: QueuedSettingsPatch) => void;
  /**
   * Puts the documents a save returned into the cache. Returning false means
   * the response could not stand in for a refetch, so the queue reconciles.
   */
  applyServerDocuments?: (
    response: TResponse,
    operations: SettingsOperation[],
  ) => boolean;
  /** Re-synchronize cache entries with the server (called after success/failure). */
  reconcile: (queryKeys: QueryKey[]) => Promise<void>;
  onStatus: (status: SettingsSaveStatus) => void;
  onError?: (cause: unknown) => void;
  debounceMs?: number;
};

export type SettingsPatchQueue = {
  enqueue: (patch: QueuedSettingsPatch) => void;
  /** Send pending patches now instead of waiting for the debounce window. */
  flush: () => Promise<void>;
  /** Re-send the patches retained after a failed request. */
  retry: () => Promise<void>;
  hasPending: () => boolean;
  reset: () => void;
};

const operationKey = (operation: SettingsOperation) =>
  `${operation.domain}:${operation.scope.type}:${operation.scope.id}`;

const mergeOperations = (
  current: SettingsOperation,
  incoming: SettingsOperation,
): SettingsOperation | undefined => {
  const currentPaths = [
    ...collectLeafPaths(current.set).map(({ path }) => path),
    ...current.unset,
  ];

  const incomingEntries = collectLeafPaths(incoming.set);

  const incomingPaths = [
    ...incomingEntries.map(({ path }) => path),
    ...incoming.unset,
  ];

  // An ancestor reset followed by a child write cannot be expressed in one
  // patch without restoring old siblings or creating a set/unset conflict.
  if (
    currentPaths.some((currentPath) =>
      incomingPaths.some(
        (incomingPath) =>
          currentPath !== incomingPath &&
          pathsOverlap(currentPath, incomingPath),
      ),
    )
  ) {
    return undefined;
  }

  const set = structuredClone(current.set);
  const unset = new Set(current.unset);

  for (const { path, value } of incomingEntries) {
    setPath(set, path, value);
    unset.delete(path);
  }

  for (const path of incoming.unset) {
    unsetPath(set, path);
    unset.add(path);
  }

  return {
    domain: current.domain,
    scope: current.scope,
    set,
    unset: [...unset],
  };
};

const sameQueryKey = (left: QueryKey, right: QueryKey) => isEqual(left, right);

/**
 * The API accepts one operation per document and one id per scope type.
 * Preserve reset boundaries in separate, ordered requests.
 */
const groupIntoBatches = (patches: QueuedSettingsPatch[]) => {
  const { "": userOnly = [], ...batches } = groupBy(patches, ({ operation }) =>
    operation.scope.type === "USER"
      ? ""
      : `${operation.scope.type}:${operation.scope.id}`,
  );

  const grouped = Object.values(batches);

  const [firstBatch, ...otherBatches] = grouped;

  const scopedBatches = firstBatch
    ? [[...userOnly, ...firstBatch], ...otherBatches]
    : [userOnly];

  return scopedBatches.flatMap((patches) => {
    const batches: QueuedSettingsPatch[][] = [];
    let batch: QueuedSettingsPatch[] = [];
    const documentKeys = new Set<string>();

    for (const patch of patches) {
      const key = operationKey(patch.operation);

      // The API accepts a document only once per request. Keep dependent
      // patches in separate requests so the server applies them in order.
      if (documentKeys.has(key)) {
        batches.push(batch);
        batch = [];
        documentKeys.clear();
      }

      batch.push(patch);
      documentKeys.add(key);
    }

    if (batch.length > 0) batches.push(batch);

    return batches;
  });
};

export const createSettingsPatchQueue = <TResponse>(
  config: SettingsPatchQueueConfig<TResponse>,
): SettingsPatchQueue => {
  const debounceMs = config.debounceMs ?? 300;
  const pending = new Map<string, QueuedSettingsPatch[]>();
  let retained = new Map<string, QueuedSettingsPatch[]>();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  const takePending = () => {
    const patches = [...pending.values()].flat();
    pending.clear();

    return patches;
  };

  const collectQueryKeys = (patches: QueuedSettingsPatch[]) => {
    const keys: QueryKey[] = [];

    for (const patch of patches) {
      for (const key of patch.queryKeys) {
        if (!keys.some((existing) => sameQueryKey(existing, key))) {
          keys.push(key);
        }
      }
    }

    return keys;
  };

  const mergePatches = (
    current: QueuedSettingsPatch[] = [],
    incoming: QueuedSettingsPatch,
  ): QueuedSettingsPatch[] => {
    const latest = current.at(-1);

    const operation =
      latest && mergeOperations(latest.operation, incoming.operation);

    if (!latest || !operation) return [...current, incoming];

    return [
      ...current.slice(0, -1),
      {
        operation,
        queryKeys: collectQueryKeys([latest, incoming]),
        afterSave: incoming.afterSave ?? latest.afterSave,
      },
    ];
  };

  /** Re-lays the patches queued after `documents` were produced on top. */
  const reapplyPending = () => {
    for (const patches of pending.values()) {
      for (const patch of patches) config.applyOptimistic(patch);
    }
  };

  /**
   * Refreshes the cache from the server, then lays the patches queued in the
   * meantime back on top: the refetched documents predate them, and without
   * this the form would briefly show, and could reset to, the stale state.
   */
  const reconcile = async (queryKeys: QueryKey[]) => {
    await config.reconcile(queryKeys);
    reapplyPending();
  };

  const sendPatches = async (patches: QueuedSettingsPatch[]) => {
    if (patches.length === 0) return;
    config.onStatus("saving");

    try {
      let cacheMatchesServer = true;
      const batches = groupIntoBatches(patches);

      for (const [index, batch] of batches.entries()) {
        const operations = batch.map((patch) => patch.operation);

        // Batches must reach the server in order: each one carries a merged
        // state for its scopes and later batches may depend on earlier ones.
        // eslint-disable-next-line no-await-in-loop
        const response = await config.send(operations);

        if (config.applyServerDocuments?.(response, operations)) {
          for (const patch of batches.slice(index + 1).flat()) {
            config.applyOptimistic(patch);
          }

          reapplyPending();
        } else {
          cacheMatchesServer = false;
        }
      }

      for (const patch of patches) patch.afterSave?.();

      if (pending.size === 0) {
        if (!cacheMatchesServer) await reconcile(collectQueryKeys(patches));

        if (pending.size > 0) config.onStatus("saving");
        else config.onStatus(retained.size > 0 ? "error" : "saved");
      }
    } catch (error) {
      const failedPatches = [...patches, ...takePending()];

      for (const patch of failedPatches) {
        const key = operationKey(patch.operation);
        retained.set(key, mergePatches(retained.get(key), patch));
      }

      config.onError?.(error);
      await reconcile(collectQueryKeys(failedPatches));
      config.onStatus("error");
    }
  };

  const run = () => {
    if (inFlight) return inFlight;

    inFlight = (async () => {
      while (pending.size > 0) {
        // Only one request is in flight at a time by design.
        // eslint-disable-next-line no-await-in-loop
        await sendPatches(takePending());
      }
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  };

  const schedule = () => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      void run();
    }, debounceMs);
  };

  return {
    enqueue: (patch) => {
      const key = operationKey(patch.operation);
      const existing = pending.get(key) ?? retained.get(key);
      retained.delete(key);
      config.applyOptimistic(patch);
      pending.set(key, mergePatches(existing, patch));
      config.onStatus("saving");
      schedule();
    },
    flush: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      return run();
    },
    retry: () => {
      for (const [key, patch] of retained) {
        if (!pending.has(key)) pending.set(key, patch);
      }

      retained = new Map();

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      return run();
    },
    hasPending: () => pending.size > 0 || retained.size > 0,
    reset: () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
      pending.clear();
      retained = new Map();
      config.onStatus("idle");
    },
  };
};
