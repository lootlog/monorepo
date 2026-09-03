const splitCommaSeparatedQuery = (value: string) =>
  value
    .split(",")
    .map((searchTerm) => searchTerm.trim())
    .filter(Boolean);

export function parseCommaSeparatedQueryList(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return splitCommaSeparatedQuery(value);
}

export function parseSearchTermsQuery(value: unknown) {
  if (typeof value !== "string" || !value.includes(",")) {
    return value;
  }

  return splitCommaSeparatedQuery(value);
}
