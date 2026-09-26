import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  decodeSettingsRecord,
  getPath,
  type SettingsJsonRecord,
} from "@lootlog/domain/settings-paths";
import {
  applySettingsPatch,
  resolveSettingsDomain,
} from "../../../../../api/src/settings-documents/settings-resolver";
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
  applyServerDocuments?: SettingsPatchQueueConfig["applyServerDocuments"],
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
    applyServerDocuments,
    reconcile,
    onStatus: (status) => statuses.push(status),
    debounceMs: 300,
  });

  return { queue, send, applyOptimistic, reconcile, statuses };
};

const sentOperations = (
  send: ReturnType<typeof vi.fn<SettingsPatchQueueConfig["send"]>>,
) => send.mock.calls.map(([operations]) => operations);

const applyOperations = (
  currentOverrides: SettingsJsonRecord,
  operations: SettingsOperation[],
) =>
  operations.reduce(
    (overrides, patch) =>
      applySettingsPatch({ ...patch, currentOverrides: overrides }),
    currentOverrides,
  );

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

  describe.each([false, true])(
    "ordered edits after failed save: %s",
    (retry) => {
      const resetRed = { unset: ["timers.defaultColorNames.red"] };

      const renameRed = {
        set: { timers: { defaultColorNames: { red: "Fire" } } },
      };

      const renameBlue = {
        set: { timers: { defaultColorNames: { blue: "Ocean" } } },
      };

      const resetNames = { unset: ["timers.defaultColorNames"] };
      const clearNames = { set: { timers: { defaultColorNames: {} } } };

      it.each([
        {
          name: "keeps a color reset when another color is renamed",
          edits: [resetRed, renameBlue],
          expected: { blue: "Ocean", green: "Green" },
        },
        {
          name: "keeps a renamed color when another color is reset",
          edits: [renameBlue, resetRed],
          expected: { blue: "Ocean", green: "Green" },
        },
        {
          name: "lets a new name replace an earlier reset",
          edits: [resetRed, renameRed],
          expected: { red: "Fire", blue: "Blue", green: "Green" },
        },
        {
          name: "resets a color after renaming it without an invalid empty parent",
          edits: [renameRed, resetRed],
          expected: { blue: "Blue", green: "Green" },
        },
        {
          name: "does not restore old names after resetting the map and renaming a color",
          edits: [resetNames, renameBlue, renameRed],
          expected: { blue: "Ocean", red: "Fire" },
        },
        {
          name: "resets the whole map after renaming a color",
          edits: [renameBlue, resetNames],
          expected: {},
        },
        {
          name: "keeps an empty-map replacement before a later color rename",
          edits: [clearNames, renameBlue],
          expected: { blue: "Ocean" },
        },
        {
          name: "clears the map after renaming a color",
          edits: [renameBlue, clearNames],
          expected: {},
        },
      ])("$name", async ({ edits, expected }) => {
        const initial: SettingsJsonRecord = {
          timers: {
            defaultColorNames: { red: "Red", blue: "Blue", green: "Green" },
          },
        };

        const operations = edits.map((edit) =>
          operation({ domain: "appearance", ...edit }),
        );

        const sequential = applyOperations(initial, operations);

        let stored = structuredClone(initial);

        const { queue, send, statuses } = createHarness(async (batch) => {
          // The API rejects duplicate documents within a single request.
          expect(
            new Set(
              batch.map(
                (patch) =>
                  `${patch.domain}:${patch.scope.type}:${patch.scope.id}`,
              ),
            ).size,
          ).toBe(batch.length);

          stored = applyOperations(stored, batch);
        });

        if (retry) send.mockRejectedValueOnce(new Error("offline"));

        for (const [index, patch] of operations.entries()) {
          queue.enqueue({ operation: patch, queryKeys: [] });

          if (retry && index === 0) {
            // Finish the failed save before editing its retained patch.
            // eslint-disable-next-line no-await-in-loop
            await queue.flush();
          }
        }

        await queue.flush();

        expect(statuses.at(-1)).toBe("saved");
        expect(stored).toEqual(sequential);
        expect(
          getPath(
            decodeSettingsRecord(
              resolveSettingsDomain("appearance", [
                { scope: userScope, overrides: stored },
              ]).effective,
            ),
            "timers.defaultColorNames",
          ),
        ).toEqual(expected);
      });
    },
  );

  it("keeps later edits visible during a split save and retries after a partial failure", async () => {
    let stored: SettingsJsonRecord = {
      timers: { defaultColorNames: { red: "Red", blue: "Blue" } },
    };

    let cached = structuredClone(stored);
    let requestCount = 0;
    const secondRequest = Promise.withResolvers<void>();
    const secondResponse = Promise.withResolvers<void>();

    const { queue, applyOptimistic, statuses } = createHarness(
      async (batch) => {
        requestCount++;

        if (requestCount === 2) {
          secondRequest.resolve();
          await secondResponse.promise;
        }

        stored = applyOperations(stored, batch);

        return structuredClone(stored);
      },
      (response) => {
        cached = decodeSettingsRecord(response);

        return true;
      },
    );

    applyOptimistic.mockImplementation(
      ({ operation }: { operation: SettingsOperation }) => {
        cached = applyOperations(cached, [operation]);
      },
    );
    queue.enqueue({
      operation: operation({
        domain: "appearance",
        unset: ["timers.defaultColorNames"],
      }),
      queryKeys: [],
    });
    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { defaultColorNames: { blue: "Ocean" } } },
      }),
      queryKeys: [],
    });
    const saving = queue.flush();
    await secondRequest.promise;

    const expected = { timers: { defaultColorNames: { blue: "Ocean" } } };
    expect(cached).toEqual(expected);
    secondResponse.reject(new Error("offline"));
    await saving;

    expect(statuses.at(-1)).toBe("error");
    expect(queue.hasPending()).toBe(true);
    await queue.retry();

    expect(statuses.at(-1)).toBe("saved");
    expect(queue.hasPending()).toBe(false);
    expect(stored).toEqual(expected);
    expect(cached).toEqual(expected);
  });

  it.each<{
    name: string;
    initial: SettingsJsonRecord;
    edits: SettingsJsonRecord[];
    expected: SettingsJsonRecord;
  }>([
    {
      name: "resetting the last timer color after changing it",
      initial: { timersColors: { Tanroth: "blue" } },
      edits: [
        { timersColors: { Tanroth: "red" } },
        { timersColors: {} },
        { hiddenDefaultColors: ["green"] },
      ],
      expected: { timersColors: {}, hiddenDefaultColors: ["green"] },
    },
    {
      name: "resetting a nested color override without clearing its siblings",
      initial: {
        overriddenDefaultColors: {
          red: { borderColor: "#123456", backgroundColor: "#654321" },
          blue: { borderColor: "#0000ff" },
        },
      },
      edits: [
        { overriddenDefaultColors: { red: { borderColor: "#abcdef" } } },
        { overriddenDefaultColors: { red: {} } },
      ],
      expected: {
        overriddenDefaultColors: {
          red: {},
          blue: { borderColor: "#0000ff" },
        },
      },
    },
    {
      name: "assigning a new color after resetting persisted colors",
      initial: { timersColors: { Tanroth: "blue" } },
      edits: [{ timersColors: {} }, { timersColors: { Heros: "red" } }],
      expected: { timersColors: { Heros: "red" } },
    },
    {
      name: "changing, resetting and assigning colors in one debounce window",
      initial: { timersColors: { Tanroth: "blue" } },
      edits: [
        { timersColors: { Heros: "green" } },
        { timersColors: {} },
        { timersColors: { Titan: "red" } },
      ],
      expected: { timersColors: { Titan: "red" } },
    },
  ])(
    "matches sequential server settings when $name",
    async ({ initial, edits, expected }) => {
      const initialOverrides = {
        timers: { defaultColorNames: { red: "Bosses" }, ...initial },
      };

      let persisted: SettingsJsonRecord = initialOverrides;

      const { queue, send, statuses } = createHarness((operations) => {
        persisted = applyOperations(persisted, operations);

        return Promise.resolve({});
      });

      const patches = edits.map((timers) =>
        operation({ domain: "appearance", set: { timers } }),
      );

      for (const patch of patches) {
        queue.enqueue({ operation: patch, queryKeys: [] });
      }

      await vi.advanceTimersByTimeAsync(300);

      expect(persisted).toEqual({
        timers: { defaultColorNames: { red: "Bosses" }, ...expected },
      });
      expect(persisted).toEqual(applyOperations(initialOverrides, patches));

      for (const batch of sentOperations(send)) {
        expect(batch).toHaveLength(1);
      }

      expect(statuses.at(-1)).toBe("saved");
    },
  );

  it("retries a failed reset before saving the color queued after it", async () => {
    let persisted: SettingsJsonRecord = {
      timers: { timersColors: { Tanroth: "blue" } },
    };

    let shouldFail = true;

    const { queue, send, statuses } = createHarness((operations) => {
      if (shouldFail) return Promise.reject(new Error("offline"));
      persisted = applyOperations(persisted, operations);

      return Promise.resolve({});
    });

    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: {} } },
      }),
      queryKeys: [],
    });
    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: { Heros: "red" } } },
      }),
      queryKeys: [],
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(statuses.at(-1)).toBe("error");
    expect(send).toHaveBeenCalledTimes(1);
    expect(persisted).toEqual({
      timers: { timersColors: { Tanroth: "blue" } },
    });

    shouldFail = false;
    await queue.retry();

    expect(persisted).toEqual({
      timers: { timersColors: { Heros: "red" } },
    });
    expect(statuses.at(-1)).toBe("saved");
    expect(queue.hasPending()).toBe(false);
  });

  it("keeps the new color visible while its preceding reset response is applied", async () => {
    let persisted: SettingsJsonRecord = {
      timers: { timersColors: { Tanroth: "blue" } },
    };

    let visible = persisted;
    const responses: Array<() => void> = [];

    const queue = createSettingsPatchQueue({
      send: (operations) =>
        new Promise<SettingsJsonRecord>((resolve) => {
          responses.push(() => {
            persisted = applyOperations(persisted, operations);
            resolve(persisted);
          });
        }),
      applyOptimistic: ({ operation }) => {
        visible = applyOperations(visible, [operation]);
      },
      applyServerDocuments: (response) => {
        visible = response;

        return true;
      },
      reconcile: () => Promise.resolve(),
      onStatus: () => {},
    });

    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: {} } },
      }),
      queryKeys: [],
    });
    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: { Heros: "red" } } },
      }),
      queryKeys: [],
    });
    const save = queue.flush();
    responses.shift()?.();
    await vi.advanceTimersByTimeAsync(0);

    expect(persisted).toEqual({ timers: { timersColors: {} } });
    expect(visible).toEqual({ timers: { timersColors: { Heros: "red" } } });

    responses.shift()?.();
    await save;

    expect(persisted).toEqual(visible);
  });

  it("retries a reset and new color queued while an older save failed", async () => {
    let persisted: SettingsJsonRecord = {
      timers: { timersColors: { Tanroth: "blue" } },
    };

    let failSave: (error: Error) => void = () => {};

    const { queue, send } = createHarness((operations) => {
      persisted = applyOperations(persisted, operations);

      return Promise.resolve({});
    });

    send.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          failSave = reject;
        }),
    );

    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: { Tanroth: "green" } } },
      }),
      queryKeys: [],
    });
    const saving = queue.flush();
    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: {} } },
      }),
      queryKeys: [],
    });
    queue.enqueue({
      operation: operation({
        domain: "appearance",
        set: { timers: { timersColors: { Heros: "red" } } },
      }),
      queryKeys: [],
    });
    failSave(new Error("offline"));
    await saving;
    await queue.retry();

    expect(persisted).toEqual({
      timers: { timersColors: { Heros: "red" } },
    });
    expect(queue.hasPending()).toBe(false);
  });

  it("uses the save response instead of refetching when it fits the cache", async () => {
    const response = { domains: { sounds: {} } };
    const applyServerDocuments = vi.fn(() => true);

    const { queue, send, applyOptimistic, reconcile, statuses } = createHarness(
      () => Promise.resolve(response),
      applyServerDocuments,
    );

    queue.enqueue({
      operation: operation({ set: { detectorVolume: 0.7 } }),
      queryKeys: [["/preferences"]],
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(send).toHaveBeenCalledTimes(1);
    expect(applyServerDocuments).toHaveBeenCalledWith(response, [
      operation({ set: { detectorVolume: 0.7 } }),
    ]);
    expect(reconcile).not.toHaveBeenCalled();
    expect(applyOptimistic).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("re-lays a write queued during the request over the save response", async () => {
    let finishSend: () => void = () => {};

    const { queue, applyOptimistic, reconcile } = createHarness(
      () =>
        new Promise((resolve) => {
          finishSend = () => resolve({ domains: {} });
        }),
      () => true,
    );

    queue.enqueue({
      operation: operation({ set: { guildIds: ["a"] } }),
      queryKeys: [["/preferences"]],
    });
    await vi.advanceTimersByTimeAsync(300);

    const laterPatch = {
      operation: operation({ set: { guildIds: ["a", "b"] } }),
      queryKeys: [["/preferences"]],
    };

    queue.enqueue(laterPatch);
    applyOptimistic.mockClear();
    finishSend();
    await vi.advanceTimersByTimeAsync(0);

    // The response predates the later write; without re-applying it the
    // form would briefly show the older server state.
    expect(applyOptimistic.mock.calls[0]?.[0]).toMatchObject({
      operation: laterPatch.operation,
    });
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("refetches when the save response cannot replace the cache entry", async () => {
    const { queue, reconcile, statuses } = createHarness(
      () => Promise.resolve({ domains: {} }),
      () => false,
    );

    queue.enqueue({
      operation: operation({ set: { detectorVolume: 0.7 } }),
      queryKeys: [["/preferences"]],
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith([["/preferences"]]);
    expect(statuses.at(-1)).toBe("saved");
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

  it("retries newer edits and other documents queued while a failed request was in flight", async () => {
    let failSend: (error: Error) => void = () => {};

    const { queue, send, reconcile, statuses } = createHarness();

    send.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          failSend = reject;
        }),
    );

    queue.enqueue({
      operation: operation({
        set: { timersVolume: 0.1, notificationsVolume: 0.3 },
      }),
      queryKeys: [["/preferences", { characterId: "first" }]],
    });
    const saving = queue.flush();

    queue.enqueue({
      operation: operation({
        set: { timersVolume: 0.9, detectorVolume: 0.7 },
      }),
      queryKeys: [["/preferences", { characterId: "second" }]],
    });
    queue.enqueue({
      operation: operation({
        domain: "timers",
        scope: { type: "GUILD", id: "guild-1" },
        set: { hiddenTimers: ["Tanroth"] },
      }),
      queryKeys: [["/guild-preferences"]],
    });

    failSend(new Error("offline"));
    await saving;
    await vi.advanceTimersByTimeAsync(300);

    expect(send).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("error");
    expect(queue.hasPending()).toBe(true);

    await queue.retry();

    expect(sentOperations(send)[1]).toEqual([
      operation({
        set: {
          timersVolume: 0.9,
          notificationsVolume: 0.3,
          detectorVolume: 0.7,
        },
      }),
      operation({
        domain: "timers",
        scope: { type: "GUILD", id: "guild-1" },
        set: { hiddenTimers: ["Tanroth"] },
      }),
    ]);
    expect(reconcile).toHaveBeenNthCalledWith(1, [
      ["/preferences", { characterId: "first" }],
      ["/preferences", { characterId: "second" }],
      ["/guild-preferences"],
    ]);
    expect(reconcile).toHaveBeenLastCalledWith([
      ["/preferences", { characterId: "first" }],
      ["/preferences", { characterId: "second" }],
      ["/guild-preferences"],
    ]);
    expect(statuses.at(-1)).toBe("saved");
    expect(queue.hasPending()).toBe(false);
  });

  it.each([
    {
      earlier: operation({ set: { detectorVolume: 0.1 } }),
      later: operation({ unset: ["detectorVolume"] }),
    },
    {
      earlier: operation({ unset: ["detectorVolume"] }),
      later: operation({ set: { detectorVolume: 0.9 } }),
    },
  ])(
    "preserves the latest reset or value when retrying a failed save",
    async ({ earlier, later }) => {
      let failSend: (error: Error) => void = () => {};

      const { queue, send } = createHarness();

      send.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            failSend = reject;
          }),
      );

      queue.enqueue({ operation: earlier, queryKeys: [] });
      const saving = queue.flush();
      queue.enqueue({ operation: later, queryKeys: [] });
      failSend(new Error("offline"));
      await saving;
      await queue.retry();

      expect(sentOperations(send)[1]).toEqual([later]);
    },
  );

  it("keeps an unrelated failed document available for retry after another document saves", async () => {
    const { queue, send, statuses } = createHarness();
    const failedOperation = operation({ set: { detectorVolume: 0.7 } });
    send.mockRejectedValueOnce(new Error("offline"));

    queue.enqueue({
      operation: failedOperation,
      queryKeys: [["/preferences"]],
    });
    await queue.flush();

    queue.enqueue({
      operation: operation({
        domain: "timers",
        set: { timersSortOrder: "desc" },
      }),
      queryKeys: [["/preferences"]],
    });
    await queue.flush();

    expect(queue.hasPending()).toBe(true);
    expect(statuses.at(-1)).toBe("error");

    await queue.retry();

    expect(sentOperations(send)[2]).toEqual([failedOperation]);
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
