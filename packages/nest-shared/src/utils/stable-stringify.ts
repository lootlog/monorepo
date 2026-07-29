export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((item) =>
      item === undefined ? "null" : stableStringify(item),
    );

    return `[${items.join(",")}]`;
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const properties = Object.keys(objectValue)
      .sort()
      .filter((key) => objectValue[key] !== undefined)
      .map(
        (key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`,
      );

    return `{${properties.join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}
