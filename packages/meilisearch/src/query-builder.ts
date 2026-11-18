import { Function, Option, Schema } from "effect";

export const getMeilisearchErrorCode = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Struct({ cause: Schema.Struct({ code: Schema.String }) }),
  ),
  (result) => Option.getOrNull(Option.map(result, (error) => error.cause.code)),
);

export function buildMeilisearchInFilter(
  fieldName: string,
  values: ReadonlyArray<string | number>,
): string {
  const formattedValues = values.map((value) => JSON.stringify(value));

  return `${fieldName} IN [${formattedValues.join(", ")}]`;
}
