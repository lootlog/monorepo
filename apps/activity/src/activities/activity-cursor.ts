import { Option, Schema } from "effect";

const CURSOR_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}Z$/;

const decodeCursorJson = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Tuple([Schema.String, Schema.String])),
);

export interface ActivityCursorPosition {
  readonly createdAt: string;
  readonly id: string;
}

export const encodeActivityCursor = ({
  createdAt,
  id,
}: ActivityCursorPosition) =>
  Buffer.from(JSON.stringify([createdAt, id])).toString("base64url");

export const parseActivityCursor = (
  cursor: string,
): Option.Option<ActivityCursorPosition> =>
  decodeCursorJson(Buffer.from(cursor, "base64url").toString("utf8")).pipe(
    Option.filter(
      ([createdAt]) =>
        CURSOR_TIMESTAMP_PATTERN.test(createdAt) &&
        !createdAt.startsWith("0000") &&
        Number.isFinite(Date.parse(createdAt)),
    ),
    Option.map(([createdAt, id]) => ({ createdAt, id })),
  );

export const ActivityCursor = Schema.String.check(
  Schema.makeFilter((value) => Option.isSome(parseActivityCursor(value)), {
    expected: "a cursor returned by a previous page",
  }),
);
