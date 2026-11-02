import { Effect, Schema } from "effect";
import { InvalidRequestError } from "#src/shared/http/http-errors";

/**
 * Lists page by keyset: fetch `limit + 1` rows ordered by a unique key
 * (a sort column plus the row ID as tiebreaker), return `limit` of them and an
 * opaque `nextCursor` that encodes the last row's key. The cursor also carries
 * the filters it was issued for, so a cursor replayed with other filters is
 * rejected instead of skipping or repeating rows.
 */
export const takeKeysetPage = <Row>(rows: Row[], limit: number) => {
  const hasMore = rows.length > limit;

  return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore };
};

export const DEFAULT_PAGE_SIZE = 20;

const EncodedCursor = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]+$/u),
  Schema.isMaxLength(512),
);

const invalidCursor = () => new InvalidRequestError({ code: "INVALID_CURSOR" });

export const encodePageCursor = <A, I>(
  schema: Schema.Codec<A, I>,
  key: A,
): string =>
  Buffer.from(JSON.stringify(Schema.encodeSync(schema)(key))).toString(
    "base64url",
  );

export const decodePageCursor = <A, I>(
  schema: Schema.Codec<A, I>,
  cursor: string,
) =>
  Schema.decodeUnknownEffect(EncodedCursor)(cursor).pipe(
    Effect.flatMap((encoded) =>
      Schema.decodeUnknownEffect(Schema.fromJsonString(schema), {
        onExcessProperty: "error",
      })(Buffer.from(encoded, "base64url").toString("utf8")),
    ),
    Effect.mapError(invalidCursor),
  );

/**
 * Turns a `limit + 1` fetch into `{ items, nextCursor }`, encoding the last
 * returned row's key with `schema`.
 */
export const toPage = <Row, A, I>(
  rows: Row[],
  limit: number,
  schema: Schema.Codec<A, I>,
  keyOf: (row: Row) => A,
) => {
  const { rows: items, hasMore } = takeKeysetPage(rows, limit);
  const last = items.at(-1);

  return {
    items,
    nextCursor:
      hasMore && last !== undefined
        ? encodePageCursor(schema, keyOf(last))
        : null,
  };
};
