import { describe, expect, it } from "bun:test";
import { Result, Schema } from "effect";
import {
  CloseRespawnWindowDto,
  CreateEventDto,
  CreateNotificationRuleDto,
  KillsControllerGetGuildKillStatsQuery,
  KillsControllerGetUserNpcKillsQuery,
  OpenRespawnWindowDto,
  UpdateNotificationRuleDto,
  UpdateReservationDto,
} from "./lootlog-api.js";

const rejects = (schema: Schema.ConstraintDecoder<unknown>, value: unknown) =>
  Result.isFailure(Schema.decodeUnknownResult(schema)(value));

describe("HttpApi contract refinements", () => {
  it("preserves event and respawn time ordering", () => {
    expect(
      rejects(CreateEventDto, {
        name: "event",
        world: "gordion",
        startsAt: "2026-09-03T12:00:00Z",
        endsAt: "2026-09-03T11:00:00Z",
      }),
    ).toBe(true);
    expect(
      rejects(OpenRespawnWindowDto, {
        minSpawnTime: "2026-09-03T12:00:00Z",
        maxSpawnTime: "2026-09-03T11:00:00Z",
      }),
    ).toBe(true);
    expect(rejects(CloseRespawnWindowDto, { createNewWindow: true })).toBe(
      true,
    );
  });

  it("preserves non-empty and cross-field mutation requirements", () => {
    expect(rejects(UpdateReservationDto, {})).toBe(true);
    expect(
      rejects(CreateNotificationRuleDto, {
        triggerType: "NPC_SPAWNED",
        targetIds: [],
      }),
    ).toBe(true);
    expect(rejects(UpdateNotificationRuleDto, { world: "  " })).toBe(true);
    expect(rejects(UpdateNotificationRuleDto, { npcIds: [] })).toBe(true);
  });

  it("preserves minimum and maximum level ordering", () => {
    expect(
      rejects(KillsControllerGetGuildKillStatsQuery, {
        minLvl: 100,
        maxLvl: 50,
      }),
    ).toBe(true);
    expect(
      rejects(KillsControllerGetUserNpcKillsQuery, {
        minLvl: 100,
        maxLvl: 50,
      }),
    ).toBe(true);
  });
});
