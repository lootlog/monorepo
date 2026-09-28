import { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import { Effect } from "effect";
import { describe, expect, it, mock } from "bun:test";
import { makeEventSummary } from "#src/events/monitoring/event-summary.service";
import type { EventSummaryStore } from "#src/events/monitoring/event-summary.repository";
import { createMemberFixture } from "../../../test/organization-fixtures.js";

const makeStore = (
  overrides: Partial<EventSummaryStore> = {},
): EventSummaryStore => ({
  findMaps: () => Effect.succeed([]),
  findPresenceLogs: () => Effect.succeed([]),
  findGaps: () => Effect.succeed([]),
  saveSummary: () => Effect.succeed({ deletedLogs: 0, deletedGaps: 0 }),
  heroExists: () => Effect.succeed(true),
  findSummaries: () => Effect.succeed([]),
  ...overrides,
});

describe("EventSummary", () => {
  it("persists window-clipped presence and AFK totals with per-log rounding", async () => {
    const windowOpenedAt = new Date(10_000);
    const windowClosedAt = new Date(20_000);
    const member = createMemberFixture();
    const secondMember = createMemberFixture({ id: 2, userId: "user-2" });

    const saveSummary = mock<EventSummaryStore["saveSummary"]>(() =>
      Effect.succeed({ deletedLogs: 0, deletedGaps: 0 }),
    );

    const summary = makeEventSummary(
      makeStore({
        findMaps: () =>
          Effect.succeed([{ id: "map-1", mapId: 1, mapName: "Map" }]),
        findPresenceLogs: () =>
          Effect.succeed([
            {
              id: "before-window",
              mapId: "map-1",
              memberId: member.id,
              member,
              isAfk: false,
              startedAt: new Date(0),
              endedAt: new Date(12_600),
            },
            {
              id: "within-window",
              mapId: "map-1",
              memberId: member.id,
              member,
              isAfk: false,
              startedAt: new Date(12_600),
              endedAt: new Date(14_200),
            },
            {
              id: "open-afk",
              mapId: "map-1",
              memberId: member.id,
              member,
              isAfk: true,
              startedAt: new Date(14_200),
              endedAt: null,
            },
            {
              id: "after-window",
              mapId: "map-1",
              memberId: secondMember.id,
              member: secondMember,
              isAfk: false,
              startedAt: new Date(18_000),
              endedAt: new Date(25_000),
            },
          ]),
        saveSummary,
      }),
    );

    await Effect.runPromise(
      summary.createWindowSummary(
        "hero-1",
        "kill-1",
        windowOpenedAt,
        windowClosedAt,
        windowOpenedAt,
        windowClosedAt,
        false,
      ),
    );

    expect(saveSummary.mock.calls[0]?.[0].data).toMatchObject({
      totalWindowSeconds: 10,
      totalCoverageSeconds: 7,
      memberStats: [
        { memberId: 1, timeSeconds: 11, afkSeconds: 6, afkPercentage: 54.55 },
        { memberId: 2, timeSeconds: 2, afkSeconds: 0, afkPercentage: 0 },
      ],
      mapStats: [{ mapId: "map-1", coverageSeconds: 7, gapSeconds: 0 }],
    });
  });

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
    const failure = new EffectDrizzleQueryError({
      query: "SELECT",
      params: [],
      cause: new Error("database unavailable"),
    });

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
    ).rejects.toBe(failure);
  });
});
