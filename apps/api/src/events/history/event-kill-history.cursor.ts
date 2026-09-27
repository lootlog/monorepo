import { Effect, Schema } from "effect";
import { InvalidRequestError } from "#src/shared/http/http-errors";

const CursorScope = Schema.Struct({
  guildId: Schema.NonEmptyString,
  eventId: Schema.NonEmptyString,
  heroId: Schema.NullOr(Schema.NonEmptyString),
  memberId: Schema.NullOr(Schema.Int.check(Schema.isGreaterThan(0))),
});

const CursorPayload = Schema.Struct({
  v: Schema.Literal(1),
  killedAt: Schema.String.check(
    Schema.isPattern(/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
  ),
  id: Schema.String.check(Schema.isUUID()),
  scope: CursorScope,
});

const EncodedCursor = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]+$/),
  Schema.isMaxLength(4096),
);

export type HistoryCursorScope = typeof CursorScope.Type;

export type HistoryBoundary = { killedAt: Date; id: string };

export const encodeHistoryCursor = (
  boundary: HistoryBoundary,
  scope: HistoryCursorScope,
): string =>
  Buffer.from(
    JSON.stringify({
      v: 1,
      killedAt: boundary.killedAt.toISOString(),
      id: boundary.id,
      scope,
    } satisfies typeof CursorPayload.Type),
  ).toString("base64url");

export const decodeHistoryCursor = Effect.fnUntraced(function* (
  cursor: string,
  scope: HistoryCursorScope,
) {
  const encoded = yield* Schema.decodeUnknownEffect(EncodedCursor)(cursor).pipe(
    Effect.mapError(() => new InvalidRequestError("Invalid cursor")),
  );

  const payload = yield* Schema.decodeUnknownEffect(
    Schema.fromJsonString(CursorPayload),
    { onExcessProperty: "error" },
  )(Buffer.from(encoded, "base64url").toString("utf8")).pipe(
    Effect.mapError(() => new InvalidRequestError("Invalid cursor")),
  );

  const killedAt = new Date(payload.killedAt);

  if (
    !Number.isFinite(killedAt.getTime()) ||
    killedAt.toISOString() !== payload.killedAt ||
    payload.scope.guildId !== scope.guildId ||
    payload.scope.eventId !== scope.eventId ||
    payload.scope.heroId !== scope.heroId ||
    payload.scope.memberId !== scope.memberId
  ) {
    return yield* Effect.fail(new InvalidRequestError("Invalid cursor"));
  }

  return { killedAt, id: payload.id };
});

const PositiveIntegerString = Schema.String.check(
  Schema.isPattern(/^[1-9]\d*$/),
);

const decodeInteger = Effect.fnUntraced(function* (
  value: string,
  name: string,
) {
  yield* Schema.decodeUnknownEffect(PositiveIntegerString)(value).pipe(
    Effect.mapError(() => new InvalidRequestError(`Invalid ${name}`)),
  );

  return yield* Schema.decodeUnknownEffect(Schema.Int)(Number(value)).pipe(
    Effect.mapError(() => new InvalidRequestError(`Invalid ${name}`)),
  );
});

export const parseHistoryLimit = Effect.fnUntraced(function* (value?: string) {
  if (value === undefined) return 20;
  const limit = yield* decodeInteger(value, "limit");

  if (limit > 100)
    return yield* Effect.fail(new InvalidRequestError("Invalid limit"));

  return limit;
});

export const parseHistoryMemberId = Effect.fnUntraced(function* (
  value: string,
) {
  const memberId = yield* decodeInteger(value, "member ID");

  return yield* Schema.decodeUnknownEffect(
    Schema.Int.check(Schema.isLessThanOrEqualTo(2147483647)),
  )(memberId).pipe(
    Effect.mapError(() => new InvalidRequestError("Invalid member ID")),
  );
});

// TODO(kill-history-legacy): Remove with UUID list endpoints; retain the versioned cursor codec.
export const decodeLegacyHistoryCursor = (cursor: string) =>
  Schema.decodeUnknownEffect(Schema.String.check(Schema.isUUID()))(cursor).pipe(
    Effect.mapError(() => new InvalidRequestError("Invalid cursor")),
  );
