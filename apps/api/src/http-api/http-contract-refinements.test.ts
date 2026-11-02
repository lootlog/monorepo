import { describe, expect, it } from "bun:test";
import { Function, Result, Schema } from "effect";
import {
  CloseRespawnWindowRequest,
  CreateEventRequest,
  EventListQuery,
  OpenRespawnWindowRequest,
} from "#src/contracts/events/schemas";
import {
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
} from "#src/contracts/notifications/schemas";
import {
  GuildKillStatsQuery,
  GuildTopKillersQuery,
  GuildTopNpcsQuery,
  MemberKillsQuery,
  UserNpcKillsQuery,
} from "#src/contracts/kills/schemas";
import { UpdateReservationRequest } from "#src/contracts/reservations/schemas";
import {
  RecentTimerHistoryQuery,
  TimerHistoryQuery,
  TimerNpcSearchQuery,
} from "#src/contracts/timers/schemas";
import { KillHistoryQuery } from "#src/events/history/event-kill-history.schema";

const rejects = (schema: Schema.ConstraintDecoder<unknown>) =>
  Function.compose(Schema.decodeUnknownResult(schema), Result.isFailure);

/** Decodes a query the way HttpApi does: every value arrives as a string. */
const decodeQuery =
  <S extends Schema.Top & { readonly DecodingServices: never }>(schema: S) =>
  (query: Record<string, string>) =>
    Schema.decodeUnknownResult(Schema.toCodecStringTree(schema))(query);

describe("HttpApi contract refinements", () => {
  it("preserves event and respawn time ordering", () => {
    expect(
      rejects(CreateEventRequest)({
        name: "event",
        world: "gordion",
        startsAt: "2026-09-03T12:00:00Z",
        endsAt: "2026-09-03T11:00:00Z",
      }),
    ).toBe(true);
    expect(
      rejects(OpenRespawnWindowRequest)({
        minSpawnTime: "2026-09-03T12:00:00Z",
        maxSpawnTime: "2026-09-03T11:00:00Z",
      }),
    ).toBe(true);
    expect(rejects(CloseRespawnWindowRequest)({ createNewWindow: true })).toBe(
      true,
    );
  });

  it("preserves non-empty and cross-field mutation requirements", () => {
    expect(rejects(UpdateReservationRequest)({})).toBe(true);
    expect(
      rejects(CreateNotificationRuleRequest)({
        triggerType: "NPC_SPAWNED",
        targetIds: [],
      }),
    ).toBe(true);
    expect(rejects(UpdateNotificationRuleRequest)({ world: "  " })).toBe(true);
    expect(rejects(UpdateNotificationRuleRequest)({ npcIds: [] })).toBe(true);
  });

  it("stores and filters events by the normalized world", () => {
    expect(
      Schema.decodeUnknownSync(CreateEventRequest)({
        name: "event",
        world: "  Aldous ",
      }).world,
    ).toBe("aldous");
    expect(rejects(CreateEventRequest)({ name: "event", world: "   " })).toBe(
      true,
    );
    expect(
      Result.getOrThrow(decodeQuery(EventListQuery)({ world: " Aldous" })),
    ).toEqual({ world: "aldous" });
  });

  it("rejects page sizes outside 1..100 or non-integer instead of clamping them", () => {
    const queries = [
      [decodeQuery(TimerHistoryQuery), { world: "tempest" }],
      [
        decodeQuery(RecentTimerHistoryQuery),
        { guildId: "g", world: "tempest" },
      ],
      [decodeQuery(TimerNpcSearchQuery), { search: "kic" }],
      [decodeQuery(KillHistoryQuery), {}],
    ] as const;

    for (const [decode, base] of queries) {
      expect(Result.isSuccess(decode({ ...base, limit: "100" }))).toBe(true);

      for (const limit of ["0", "101", "1.5", "2garbage", "-1"]) {
        expect(Result.isFailure(decode({ ...base, limit }))).toBe(true);
      }
    }
  });

  it("rejects an NPC level range whose minimum exceeds its maximum", () => {
    for (const schema of [
      GuildKillStatsQuery,
      GuildTopNpcsQuery,
      UserNpcKillsQuery,
      MemberKillsQuery,
    ]) {
      expect(rejects(schema)({ npcLevelMin: 100, npcLevelMax: 50 })).toBe(true);
      expect(rejects(schema)({ npcLevelMin: 50, npcLevelMax: 100 })).toBe(
        false,
      );
    }
  });

  it("rejects unknown NPC types in kill filters", () => {
    expect(rejects(GuildKillStatsQuery)({ npcTypes: ["HERO", "BOSS"] })).toBe(
      true,
    );
    expect(rejects(GuildTopNpcsQuery)({ npcType: "BOSS" })).toBe(true);
    expect(rejects(GuildKillStatsQuery)({ npcTypes: ["HERO", "TITAN"] })).toBe(
      false,
    );
  });

  it("bounds kill ranking sizes", () => {
    for (const schema of [GuildTopNpcsQuery, GuildTopKillersQuery]) {
      expect(rejects(schema)({ limit: 101 })).toBe(true);
      expect(rejects(schema)({ limit: 0 })).toBe(true);
      expect(rejects(schema)({ limit: 100 })).toBe(false);
    }
  });
});
