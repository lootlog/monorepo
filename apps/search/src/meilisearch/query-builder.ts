import { Function, Option, Schema } from "effect";

export const getMeilisearchErrorCode = Function.compose(
  Schema.decodeUnknownOption(
    Schema.Struct({ cause: Schema.Struct({ code: Schema.String }) }),
  ),
  (result) => Option.getOrNull(Option.map(result, (error) => error.cause.code)),
);

export function buildMeilisearchStringInFilter(
  fieldName: string,
  values: string[],
): string {
  const formattedValues = values.map((value) => JSON.stringify(value));

  return `${fieldName} IN [${formattedValues.join(", ")}]`;
}

export function buildMeilisearchSearchTermFilter(
  fieldName: string,
  search: string | string[] | undefined,
) {
  if (Array.isArray(search)) {
    return {
      searchTerm: "",
      filter: buildMeilisearchStringInFilter(fieldName, search),
    };
  }

  return {
    searchTerm: search ?? "",
  };
}
