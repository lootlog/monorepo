type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function getMeilisearchErrorCode(error: unknown): string | null {
  if (!isRecord(error) || !isRecord(error.cause)) {
    return null;
  }

  const { code } = error.cause;
  return typeof code === "string" ? code : null;
}

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
): { searchTerm: string; filter?: string } {
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
