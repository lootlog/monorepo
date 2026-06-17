type MeilisearchErrorCause = {
  cause?: {
    code?: unknown;
  };
};

export function getMeilisearchErrorCode(error: unknown): string | null {
  const code = (error as MeilisearchErrorCause | null)?.cause?.code;

  return typeof code === "string" ? code : null;
}

export function buildMeilisearchStringInFilter(
  fieldName: string,
  values: string[],
): string {
  const formattedValues = values.map((value) => JSON.stringify(value));

  return `${fieldName} IN [${formattedValues.join(", ")}]`;
}
