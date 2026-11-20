import { afterEach, expect, it, vi } from "vitest";
import { createLootListReconciliation } from "./loot-list-reconciliation";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("coalesces duplicates and events during a request without concurrent work or an event queue", async () => {
  vi.useFakeTimers();
  let finish: (() => void) | undefined;

  const refresh = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );

  const coordinator = createLootListReconciliation({
    refresh,
    canRefresh: () => true,
  });

  for (let event = 0; event < 1000; event++) coordinator.markDirty();
  await vi.advanceTimersByTimeAsync(35_000);
  expect(refresh).toHaveBeenCalledTimes(1);

  for (let event = 0; event < 1000; event++) coordinator.markDirty();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  finish?.();
  await vi.advanceTimersByTimeAsync(35_000);
  expect(refresh).toHaveBeenCalledTimes(2);
  finish?.();
  await vi.advanceTimersByTimeAsync(35_000);
  expect(refresh).toHaveBeenCalledTimes(2);
  coordinator.dispose();
});

it("waits while hidden or browsing history, and recovers failed refreshes automatically in the background", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  let visibleAtTop = false;

  const refresh = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(undefined);

  const coordinator = createLootListReconciliation({
    refresh,
    canRefresh: () => visibleAtTop,
  });

  coordinator.markDirty();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(refresh).not.toHaveBeenCalled();
  visibleAtTop = true;
  coordinator.resume();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  coordinator.markDirty();
  await vi.advanceTimersByTimeAsync(59_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(6_000);
  expect(refresh).toHaveBeenCalledTimes(2);
  coordinator.markDirty();
  coordinator.dispose();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(refresh).toHaveBeenCalledTimes(2);
});

it("jitters reconnect reconciliation and bounds 500-client single, burst, duplicate and mixed-version loads", async () => {
  vi.useFakeTimers();
  const clients = 500;
  const events = 200;
  let listRequests = 0;
  const requestTimes: number[] = [];

  const coordinators = Array.from({ length: clients }, () =>
    createLootListReconciliation({
      refresh: async () => {
        listRequests++;
        requestTimes.push(Date.now());
      },
      canRefresh: () => true,
    }),
  );

  // One event per client is delayed and jittered, never a detail GET.
  for (const coordinator of coordinators) coordinator.markDirty();
  await vi.advanceTimersByTimeAsync(29_999);
  expect(listRequests).toBe(0);
  await vi.advanceTimersByTimeAsync(5001);
  expect(listRequests).toBe(clients);
  expect(new Set(requestTimes).size).toBeGreaterThan(1);
  listRequests = 0;

  // Duplicate and distinct events share the same constant-memory dirty bit.
  for (const coordinator of coordinators) {
    for (let event = 0; event < events; event++) coordinator.markDirty();
  }

  await vi.advanceTimersByTimeAsync(35_000);
  expect(listRequests).toBe(clients);

  for (const coordinator of coordinators) {
    // Reconnection plus redelivery does not multiply reconciliation.
    coordinator.markDirty();
    coordinator.markDirty();
  }

  await vi.advanceTimersByTimeAsync(35_000);
  expect(listRequests).toBe(2 * clients);

  for (const coordinator of coordinators) coordinator.dispose();
  let mixedDetailRequests = 0;
  let mixedListRequests = 0;

  const mixedClients = Array.from({ length: clients }, (_, index) => {
    if (index % 2 === 0)
      return {
        markDirty: () => {
          mixedDetailRequests++;
        },
        dispose: (): void => undefined,
      };

    return createLootListReconciliation({
      refresh: async () => {
        mixedListRequests++;
      },
      canRefresh: () => true,
    });
  });

  for (const client of mixedClients) {
    for (let event = 0; event < events; event++) client.markDirty();
  }

  await vi.advanceTimersByTimeAsync(35_000);
  expect(mixedDetailRequests).toBe(50_000);
  expect(mixedListRequests).toBe(250);

  for (const client of mixedClients) client.dispose();
});

it("backs off repeated failures, caps the delay and resets it after recovery", async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0);
  const refresh = vi.fn().mockRejectedValue(new Error("offline"));

  const coordinator = createLootListReconciliation({
    refresh,
    canRefresh: () => true,
  });

  coordinator.markDirty();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(refresh).toHaveBeenCalledTimes(1);

  for (const [index, delay] of [
    60_000, 120_000, 240_000, 300_000, 300_000,
  ].entries()) {
    coordinator.markDirty();
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(refresh).toHaveBeenCalledTimes(index + 1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(index + 2);
  }

  refresh.mockResolvedValue(undefined);
  await vi.advanceTimersByTimeAsync(300_000);
  coordinator.markDirty();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(refresh).toHaveBeenCalledTimes(8);
  coordinator.dispose();
});
