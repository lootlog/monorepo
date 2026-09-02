import { expect, test } from "bun:test";
import { Schema } from "effect";
import {
  CreateReservationDto,
  EventKillHistoryResponseDto__schema0,
  GuildDocumentResponseDto__schema0,
  KillDetailResponseDto__schema0,
} from "./lootlog-api.generated.js";
import { restoreNullableSchemas } from "./restore-nullable-schemas.js";

test("keeps the checked-in HttpApi source normalized", async () => {
  const source = await Bun.file(
    new URL("./lootlog-api.generated.ts", import.meta.url),
  ).text();

  expect(restoreNullableSchemas(source)).toBe(source);
});

test("preserves nullable JSON schemas from the legacy OpenAPI contract", () => {
  expect(Schema.is(GuildDocumentResponseDto__schema0)(null)).toBe(true);
  expect(Schema.is(EventKillHistoryResponseDto__schema0)(null)).toBe(true);
  expect(Schema.is(KillDetailResponseDto__schema0)(null)).toBe(true);
});

test("accepts a null reservation reminder", () => {
  expect(
    Schema.is(CreateReservationDto)({
      startsAt: "2026-09-02T10:00:00Z",
      endsAt: "2026-09-02T11:00:00Z",
      reminderMinutesBefore: null,
    }),
  ).toBe(true);
});
