import { Effect, Schema } from "effect";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { decodePageCursor, encodePageCursor } from "#src/shared/keyset-page";

const CursorScope = Schema.Struct({
  guildId: Schema.NonEmptyString,
  eventId: Schema.NonEmptyString,
  heroId: Schema.NullOr(Schema.NonEmptyString),
  memberId: Schema.NullOr(Schema.Int.check(Schema.isGreaterThan(0))),
});

const CursorPayload = Schema.Struct({
  v: Schema.Literal(1),
  killedAt: Schema.String.check(
    Schema.isPattern(/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u),
  ),
  // Kills recorded before the move to UUIDs keep their cuid IDs.
  id: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
  scope: CursorScope,
});

export type HistoryCursorScope = typeof CursorScope.Type;

export type HistoryBoundary = { killedAt: Date; id: string };

export const encodeHistoryCursor = (
  boundary: HistoryBoundary,
  scope: HistoryCursorScope,
): string =>
  encodePageCursor(CursorPayload, {
    v: 1,
    killedAt: boundary.killedAt.toISOString(),
    id: boundary.id,
    scope,
  });

export const decodeHistoryCursor = Effect.fnUntraced(function* (
  cursor: string,
  scope: HistoryCursorScope,
) {
  const payload = yield* decodePageCursor(CursorPayload, cursor);

  const killedAt = new Date(payload.killedAt);

  if (
    !Number.isFinite(killedAt.getTime()) ||
    killedAt.toISOString() !== payload.killedAt ||
    payload.scope.guildId !== scope.guildId ||
    payload.scope.eventId !== scope.eventId ||
    payload.scope.heroId !== scope.heroId ||
    payload.scope.memberId !== scope.memberId
  ) {
    return yield* Effect.fail(
      new InvalidRequestError({ code: "INVALID_CURSOR" }),
    );
  }

  return { killedAt, id: payload.id };
});
