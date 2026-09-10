/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import type { QueryKey } from "@tanstack/react-query";
import { isRecord } from "@lootlog/schema/records";
import type { SettingsOperation, SettingsScope } from "./settings-documents";
import type { SettingsSaveStatus } from "./settings-save-status.store";

export type QueuedSettingsPatch = {
  operation: SettingsOperation;
  /** Cache entries this operation belongs to (optimistic update + reconcile). */
  queryKeys: QueryKey[];
  /** Extra work after the server accepted the patch (e.g. invalidate lists). */
  afterSave?: () => void;
};

export type SettingsPatchQueueConfig = {
  send: (operations: SettingsOperation[]) => Promise<unknown>;
  applyOptimistic: (patch: QueuedSettingsPatch) => void;
  /** Re-synchronize cache entries with the server (called after success/failure). */
  reconcile: (queryKeys: QueryKey[]) => Promise<void>;
  onStatus: (status: SettingsSaveStatus) => void;
  onError?: (error: unknown) => void;
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
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...current };

  for (const [key, value] of Object.entries(incoming)) {
    const existing = merged[key];

    merged[key] =
      isRecord(existing) && isRecord(value) ? mergeSet(existing, value) : value;
  }

  return merged;
};

const removePath = (set: Record<string, unknown>, path: string) => {
  const [head, ...rest] = path.split(".");

  if (!head || !(head in set)) return;

  if (rest.length === 0) {
    delete set[head];

    return;
  }

  const nested = set[head];

  if (isRecord(nested)) removePath(nested, rest.join("."));
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

const sameQueryKey = (left: QueryKey, right: QueryKey) =>
  JSON.stringify(left) === JSON.stringify(right);

/**
 * One request batch cannot hold two different ids for the same scope type,
 * so pending operations are grouped by their non-user scope ids.
 */
const groupIntoBatches = (operations: SettingsOperation[]) => {
  const batches = new Map<string, SettingsOperation[]>();

  for (const operation of operations) {
    const key =
      operation.scope.type === "USER"
        ? ""
        : `${operation.scope.type}:${operation.scope.id}`;

    batches.set(key, [...(batches.get(key) ?? []), operation]);
  }

  const userOnly = batches.get("") ?? [];
  batches.delete("");
  const grouped = [...batches.values()];

  if (userOnly.length === 0) return grouped;

  const [firstBatch, ...otherBatches] = grouped;

  if (!firstBatch) return [userOnly];

  return [[...userOnly, ...firstBatch], ...otherBatches];
};

export const createSettingsPatchQueue = (
  config: SettingsPatchQueueConfig,
): SettingsPatchQueue => {
  const debounceMs = config.debounceMs ?? 300;
  const pending = new Map<string, QueuedSettingsPatch>();
  let retained = new Map<string, QueuedSettingsPatch>();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  const takePending = () => {
    const patches = [...pending.values()];
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

  const sendPatches = async (patches: QueuedSettingsPatch[]) => {
    if (patches.length === 0) return;
    config.onStatus("saving");

    try {
      for (const batch of groupIntoBatches(
        patches.map((patch) => patch.operation),
      )) {
        // Batches must reach the server in order: each one carries a merged
        // state for its scopes and later batches may depend on earlier ones.
        // eslint-disable-next-line no-await-in-loop
        await config.send(batch);
      }

      retained = new Map();

      for (const patch of patches) patch.afterSave?.();

      if (pending.size === 0) {
        await config.reconcile(collectQueryKeys(patches));
        config.onStatus(pending.size === 0 ? "saved" : "saving");
      }
    } catch (error) {
      for (const patch of patches) {
        const key = operationKey(patch.operation);
        const existing = retained.get(key);
        retained.set(
          key,
          existing
            ? {
                ...existing,
                operation: mergeOperations(existing.operation, patch.operation),
              }
            : patch,
        );
      }

      pending.clear();
      config.onError?.(error);
      await config.reconcile(collectQueryKeys(patches));
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
      pending.set(key, {
        operation: existing
          ? mergeOperations(existing.operation, patch.operation)
          : patch.operation,
        queryKeys: collectQueryKeys(existing ? [existing, patch] : [patch]),
        afterSave: patch.afterSave ?? existing?.afterSave,
      });
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

export const createSettingsScope = (
  type: SettingsScope["type"],
  id: string,
): SettingsScope => ({ type, id });
