const splitCommaSeparatedQuery = (value: string) =>
  value
    .split(",")
    .map((searchTerm) => searchTerm.trim())
    .filter((searchTerm) => searchTerm.length > 0);

export function parseCommaSeparatedQuery(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return splitCommaSeparatedQuery(value);
}

export function parseCommaSeparatedSearchQuery(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  if (!value.includes(",")) {
    return value;
  }

  return splitCommaSeparatedQuery(value);
}
