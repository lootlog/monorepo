import { describe, expect, it } from "bun:test";
import { Result, Schema } from "effect";
import {
  CloseRespawnWindowRequest,
  CreateEventRequest,
  OpenRespawnWindowRequest,
} from "#src/contracts/events/schemas";
import {
  CreateNotificationRuleRequest,
  UpdateNotificationRuleRequest,
} from "#src/contracts/notifications/schemas";
import {
  GuildKillStatsQuery,
  UserNpcKillsQuery,
} from "#src/contracts/kills/schemas";
import { UpdateReservationRequest } from "#src/contracts/reservations/schemas";

const rejects = (schema: Schema.ConstraintDecoder<unknown>, value: unknown) =>
  Result.isFailure(Schema.decodeUnknownResult(schema)(value));

describe("HttpApi contract refinements", () => {
  it("preserves event and respawn time ordering", () => {
    expect(
      rejects(CreateEventRequest, {
        name: "event",
        world: "gordion",
        startsAt: "2026-09-03T12:00:00Z",
        endsAt: "2026-09-03T11:00:00Z",
      }),
    ).toBe(true);
    expect(
      rejects(OpenRespawnWindowRequest, {
        minSpawnTime: "2026-09-03T12:00:00Z",
        maxSpawnTime: "2026-09-03T11:00:00Z",
      }),
    ).toBe(true);
    expect(rejects(CloseRespawnWindowRequest, { createNewWindow: true })).toBe(
      true,
    );
  });

  it("preserves non-empty and cross-field mutation requirements", () => {
    expect(rejects(UpdateReservationRequest, {})).toBe(true);
    expect(
      rejects(CreateNotificationRuleRequest, {
        triggerType: "NPC_SPAWNED",
        targetIds: [],
      }),
    ).toBe(true);
    expect(rejects(UpdateNotificationRuleRequest, { world: "  " })).toBe(true);
    expect(rejects(UpdateNotificationRuleRequest, { npcIds: [] })).toBe(true);
  });

  it("preserves minimum and maximum level ordering", () => {
    expect(
      rejects(GuildKillStatsQuery, {
        minLvl: 100,
        maxLvl: 50,
      }),
    ).toBe(true);
    expect(
      rejects(UserNpcKillsQuery, {
        minLvl: 100,
        maxLvl: 50,
      }),
    ).toBe(true);
  });
});
