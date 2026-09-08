export type JsonValue =
  | boolean
  | number
  | string
  | null
  | ReadonlyArray<JsonValue>
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export const isJsonObject = (
  value: JsonValue | undefined,
): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);
