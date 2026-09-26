import {
  collectLeafPaths,
  isSettingsRecord,
  pathsOverlap,
  setPath,
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

const mergeSet = (
  current: SettingsOperation["set"],
  incoming: SettingsOperation["set"],
): SettingsOperation["set"] => {
  const merged = structuredClone(current);

  for (const { path, value } of collectLeafPaths(incoming)) {
    setPath(merged, path, value);
  }

  return merged;
};

const removePath = (set: SettingsOperation["set"], path: string) => {
  const [head, ...rest] = path.split(".");

  if (!head || !(head in set)) return;

  if (rest.length === 0) {
    delete set[head];

    return;
  }

  const nested = set[head];

  if (isSettingsRecord(nested)) removePath(nested, rest.join("."));
};

const mergeOperations = (
  current: SettingsOperation,
  incoming: SettingsOperation,
): SettingsOperation => {
  const set = mergeSet(current.set, incoming.set);

  for (const path of incoming.unset) removePath(set, path);

  const unset = [
    ...current.unset.filter(
      (path) =>
        !incoming.unset.includes(path) &&
        !Object.keys(incoming.set).some(
          (key) => path === key || path.startsWith(`${key}.`),
        ),
    ),
    ...incoming.unset,
  ];

  return { domain: current.domain, scope: current.scope, set, unset };
};

const requiresSeparateOperation = (
  current: SettingsOperation,
  incoming: SettingsOperation,
) => {
  const incomingPaths = collectLeafPaths(incoming.set);

  // An empty map clears persisted children. Merging a later child write into
  // it would erase the reset, so these operations must reach the API in order.
  return collectLeafPaths(current.set).some(
    ({ path, value }) =>
      isSettingsRecord(value) &&
      (incomingPaths.some((incomingPath) =>
        incomingPath.path.startsWith(`${path}.`),
      ) ||
        incoming.unset.some((unset) => pathsOverlap(path, unset))),
  );
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

  if (userOnly.length > 0) {
    if (grouped[0]) grouped[0].unshift(...userOnly);
    else grouped.push(userOnly);
  }

  return grouped.flatMap((patches) => {
    const batches: QueuedSettingsPatch[][] = [];
    let batch: QueuedSettingsPatch[] = [];
    const keys = new Set<string>();

    for (const patch of patches) {
      const key = operationKey(patch.operation);

      if (keys.has(key)) {
        batches.push(batch);
        batch = [];
        keys.clear();
      }

      batch.push(patch);
      keys.add(key);
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

  const appendPatch = (
    patches: QueuedSettingsPatch[],
    patch: QueuedSettingsPatch,
  ): QueuedSettingsPatch[] => {
    const existing = patches.at(-1);

    if (
      !existing ||
      requiresSeparateOperation(existing.operation, patch.operation)
    ) {
      return [...patches, patch];
    }

    return [
      ...patches.slice(0, -1),
      {
        operation: mergeOperations(existing.operation, patch.operation),
        queryKeys: collectQueryKeys([existing, patch]),
        afterSave: patch.afterSave ?? existing.afterSave,
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
        // Batches must reach the server in order: each one carries a merged
        // state for its scopes and later batches may depend on earlier ones.
        const operations = batch.map((patch) => patch.operation);

        // eslint-disable-next-line no-await-in-loop
        const response = await config.send(operations);

        if (config.applyServerDocuments?.(response, operations)) {
          for (const remainingBatch of batches.slice(index + 1)) {
            for (const patch of remainingBatch) config.applyOptimistic(patch);
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
        retained.set(key, appendPatch(retained.get(key) ?? [], patch));
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
      const existing = pending.get(key) ?? retained.get(key) ?? [];
      retained.delete(key);
      config.applyOptimistic(patch);
      pending.set(key, appendPatch(existing, patch));
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
