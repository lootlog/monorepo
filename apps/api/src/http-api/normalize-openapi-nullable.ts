type JsonObject = { [key: string]: JsonValue };
type JsonValue =
  | JsonObject
  | readonly JsonValue[]
  | boolean
  | number
  | string
  | null;

const decodeJsonPointerToken = (token: string): string =>
  token.replaceAll("~1", "/").replaceAll("~0", "~");

const encodeJsonPointerToken = (token: string): string =>
  token.replaceAll("~", "~0").replaceAll("/", "~1");

const isJsonObject = (value: JsonValue): value is JsonObject =>
  value !== null && !Array.isArray(value) && typeof value === "object";

const isOpenObjectMarker = (value: JsonValue): boolean =>
  isJsonObject(value) &&
  value.type === "object" &&
  isJsonObject(value.additionalProperties) &&
  Object.keys(value.additionalProperties).length === 0 &&
  Object.keys(value).length === 2;

export const normalizeOpenApiNullable = (document: unknown): JsonValue => {
  const nullablePaths: string[][] = [];

  const normalize = (value: JsonValue, path: string[]): JsonValue => {
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        normalize(item, [...path, String(index)]),
      );
    }
    if (!isJsonObject(value)) {
      return value;
    }

    const normalized: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      if (key !== "nullable") {
        normalized[key] = normalize(item, [...path, key]);
      }
    }

    if (
      Array.isArray(normalized.allOf) &&
      normalized.allOf.length === 1 &&
      isOpenObjectMarker(normalized.allOf[0] as JsonValue)
    ) {
      delete normalized.allOf;
      normalized.additionalProperties = {};
    }

    if (value.nullable !== true) {
      return normalized;
    }

    nullablePaths.push(path);
    return { anyOf: [normalized, { type: "null" }] };
  };

  const normalized = normalize(document as JsonValue, []);

  const rewriteReferences = (value: JsonValue): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        rewriteReferences(item);
      }
      return;
    }
    if (!isJsonObject(value)) {
      return;
    }

    if (typeof value.$ref === "string" && value.$ref.startsWith("#/")) {
      const referencePath = value.$ref
        .slice(2)
        .split("/")
        .map(decodeJsonPointerToken);
      const insertionIndexes = nullablePaths
        .filter(
          (nullablePath) =>
            nullablePath.length < referencePath.length &&
            nullablePath.every(
              (segment, index) => segment === referencePath[index],
            ),
        )
        .map((nullablePath) => nullablePath.length)
        .sort((left, right) => right - left);

      for (const index of insertionIndexes) {
        referencePath.splice(index, 0, "anyOf", "0");
      }
      value.$ref = `#/${referencePath.map(encodeJsonPointerToken).join("/")}`;
    }

    for (const item of Object.values(value)) {
      rewriteReferences(item);
    }
  };

  rewriteReferences(normalized);
  return normalized;
};
