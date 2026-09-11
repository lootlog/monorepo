import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSettingsPatchQueue,
  type SettingsPatchQueueConfig,
} from "./settings-patch-queue";
import type { SettingsOperation } from "./settings-documents";

const userScope = { type: "USER", id: "user" } as const;

const operation = (
  overrides: Partial<SettingsOperation> = {},
): SettingsOperation => ({
  domain: "sounds",
  scope: userScope,
  set: {},
  unset: [],
  ...overrides,
});

const createHarness = (
  sendImplementation?: SettingsPatchQueueConfig["send"],
) => {
  const statuses: string[] = [];

  const send = vi.fn<SettingsPatchQueueConfig["send"]>(
    sendImplementation ?? (() => Promise.resolve({})),
  );

  const applyOptimistic = vi.fn();
  const reconcile = vi.fn(() => Promise.resolve());

  const queue = createSettingsPatchQueue({
    send,
    applyOptimistic,
    reconcile,
    onStatus: (status) => statuses.push(status),
    debounceMs: 300,
  });

  return { queue, send, applyOptimistic, reconcile, statuses };
};

const sentOperations = (
  send: ReturnType<typeof vi.fn<SettingsPatchQueueConfig["send"]>>,
) => send.mock.calls.map(([operations]) => operations);

describe("settings patch queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("merges writes to the same document within the debounce window and sends one request", async () => {
    const { queue, send, applyOptimistic, statuses } = createHarness();

    queue.enqueue({
      operation: operation({ set: { notificationsVolume: 0.2 } }),
      queryKeys: [["/preferences"]],
    });
    queue.enqueue({
      operation: operation({
        set: { notificationsConfig: { HERO: { soundUrl: "a" } } },
      }),
      queryKeys: [["/preferences"]],
    });
    queue.enqueue({
      operation: operation({
        set: { notificationsConfig: { HERO: { volume: 1 } } },
      }),
      queryKeys: [["/preferences"]],
    });

    expect(applyOptimistic).toHaveBeenCalledTimes(3);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);

    expect(sentOperations(send)).toEqual([
      [
        operation({
          set: {
            notificationsVolume: 0.2,
            notificationsConfig: { HERO: { soundUrl: "a", volume: 1 } },
          },
        }),
      ],
    ]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("drops a pending set path when a later write unsets it", async () => {
    const { queue, send } = createHarness();

    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: { Tanroth: "red" } } },
      }),
      queryKeys: [],
    });
    queue.enqueue({
      operation: operation({
        domain: "appearance",
        unset: ["timers.timersColors.Tanroth"],
      }),
      queryKeys: [],
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(sentOperations(send)).toEqual([
      [
        operation({
          domain: "appearance",
          set: { timers: { timersColors: {} } },
          unset: ["timers.timersColors.Tanroth"],
        }),
      ],
    ]);
  });

  it("splits guild scoped documents into separate requests", async () => {
    const { queue, send } = createHarness();

    queue.enqueue({
      operation: operation({
        domain: "timers",
        set: { timersSortOrder: "desc" },
      }),
      queryKeys: [],
    });
    queue.enqueue({
      operation: operation({
        domain: "timers",
        scope: { type: "GUILD", id: "guild-1" },
        set: { hiddenTimers: ["a"] },
      }),
      queryKeys: [],
    });
    queue.enqueue({
      operation: operation({
        domain: "timers",
        scope: { type: "GUILD", id: "guild-2" },
        set: { hiddenTimers: ["b"] },
      }),
      queryKeys: [],
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(
      sentOperations(send).map((operations) =>
        operations.map((item) => item.scope.id),
      ),
    ).toEqual([["user", "guild-1"], ["guild-2"]]);
  });

  it("keeps a failed patch for retry, reconciles the cache and reports the error", async () => {
    let shouldFail = true;

    const { queue, send, reconcile, statuses } = createHarness(() =>
      shouldFail ? Promise.reject(new Error("offline")) : Promise.resolve({}),
    );

    queue.enqueue({
      operation: operation({ set: { detectorVolume: 0.7 } }),
      queryKeys: [["/preferences"]],
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(statuses.at(-1)).toBe("error");
    expect(reconcile).toHaveBeenCalledWith([["/preferences"]]);
    expect(queue.hasPending()).toBe(true);

    shouldFail = false;
    await queue.retry();

    expect(sentOperations(send)).toEqual([
      [operation({ set: { detectorVolume: 0.7 } })],
      [operation({ set: { detectorVolume: 0.7 } })],
    ]);
    expect(statuses.at(-1)).toBe("saved");
    expect(queue.hasPending()).toBe(false);
  });

  it("sends writes queued during an in-flight request afterwards instead of dropping them", async () => {
    const resolvers: Array<() => void> = [];

    const { queue, send, statuses } = createHarness(
      () =>
        new Promise((resolve) => {
          resolvers.push(() => resolve({}));
        }),
    );

    queue.enqueue({
      operation: operation({ set: { timersVolume: 0.1 } }),
      queryKeys: [],
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(send).toHaveBeenCalledTimes(1);

    queue.enqueue({
      operation: operation({ set: { timersVolume: 0.9 } }),
      queryKeys: [],
    });
    resolvers.shift()?.();
    await vi.advanceTimersByTimeAsync(0);

    expect(send).toHaveBeenCalledTimes(2);
    expect(sentOperations(send)[1]).toEqual([
      operation({ set: { timersVolume: 0.9 } }),
    ]);
    expect(statuses.at(-1)).toBe("saving");
    resolvers.shift()?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses.at(-1)).toBe("saved");
  });
  it("re-applies a write queued while the cache was refreshing so the refetch cannot hide it", async () => {
    let finishReconcile: () => void = () => {};

    const { queue, send, applyOptimistic, reconcile } = createHarness();
    reconcile.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishReconcile = resolve;
        }),
    );

    queue.enqueue({
      operation: operation({ set: { guildIds: ["a"] } }),
      queryKeys: [["/preferences"]],
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(send).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);

    const laterPatch = {
      operation: operation({ set: { guildIds: ["a", "b"] } }),
      queryKeys: [["/preferences"]],
    };

    queue.enqueue(laterPatch);
    applyOptimistic.mockClear();

    finishReconcile();
    await vi.advanceTimersByTimeAsync(0);

    expect(applyOptimistic).toHaveBeenCalledWith(
      expect.objectContaining({ operation: laterPatch.operation }),
    );
  });
});
