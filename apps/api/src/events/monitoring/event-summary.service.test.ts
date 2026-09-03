import { Effect } from "effect";
import { describe, expect, it, mock } from "bun:test";
import { makeEventSummary } from "#src/events/monitoring/event-summary.service";
import type { EventSummaryStore } from "#src/events/monitoring/event-summary.repository";

const makeStore = (overrides: Record<string, unknown> = {}) =>
  ({
    findMaps: () => Effect.succeed([]),
    findPresenceLogs: () => Effect.succeed([]),
    findGaps: () => Effect.succeed([]),
    saveSummary: () => Effect.succeed({ deletedLogs: 0, deletedGaps: 0 }),
    heroExists: () => Effect.succeed(true),
    findSummaries: () => Effect.succeed([]),
    ...overrides,
  }) as unknown as EventSummaryStore;

describe("EventSummary", () => {
  it("does not persist an empty hero window", async () => {
    const saveSummary = mock(() =>
      Effect.succeed({ deletedLogs: 0, deletedGaps: 0 }),
    );
    const summary = makeEventSummary(makeStore({ saveSummary }));

    await Effect.runPromise(
      summary.createWindowSummary(
        "hero-1",
        null,
        new Date("2026-01-01T10:00:00.000Z"),
        new Date("2026-01-01T11:00:00.000Z"),
        new Date("2026-01-01T10:00:00.000Z"),
        new Date("2026-01-01T11:00:00.000Z"),
        false,
      ),
    );

    expect(saveSummary).not.toHaveBeenCalled();
  });

  it("keeps a hidden hero indistinguishable from an empty history", async () => {
    const findSummaries = mock(() => Effect.succeed([]));
    const summary = makeEventSummary(
      makeStore({
        heroExists: () => Effect.succeed(false),
        findSummaries,
      }),
    );

    await expect(
      Effect.runPromise(
        summary.getHeroWindowSummaries("guild-1", "event-1", "hero-1"),
      ),
    ).resolves.toEqual({ data: [], nextCursor: null });
    expect(findSummaries).not.toHaveBeenCalled();
  });

  it("propagates a typed store failure without persisting partial state", async () => {
    const failure = new Error("database unavailable");
    const summary = makeEventSummary(
      makeStore({ findMaps: () => Effect.fail(failure) }),
    );

    await expect(
      Effect.runPromise(
        summary.createWindowSummary(
          "hero-1",
          "kill-1",
          new Date("2026-01-01T10:00:00.000Z"),
          new Date("2026-01-01T11:00:00.000Z"),
          new Date("2026-01-01T10:00:00.000Z"),
          new Date("2026-01-01T11:00:00.000Z"),
          false,
        ),
      ),
    ).rejects.toThrow("database unavailable");
  });
});
