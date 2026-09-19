import { Predicate, Schema } from "effect";

// Dotted-path helpers shared by the API resolver and the Game client cache.
const SettingsJsonRecordSchema = Schema.Record(Schema.String, Schema.Json);

export type SettingsJsonRecord = Record<string, typeof Schema.Json.Type>;

export const decodeSettingsRecord = Schema.decodeUnknownSync(
  SettingsJsonRecordSchema,
);

// JSON leaves have already been decoded at the document boundary.
export const isSettingsRecord = (
  value: typeof Schema.Json.Type | undefined,
): value is SettingsJsonRecord => Predicate.isObject(value);

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Paths come from client patches; a segment that names a prototype property
 * would let `setPath` reach `Object.prototype` through a freshly cloned
 * record, so such paths are rejected before any write.
 */
const splitWritablePath = (path: string) => {
  const segments = path.split(".");

  for (const segment of segments) {
    if (FORBIDDEN_SEGMENTS.has(segment)) {
      throw new Error(`Unsafe setting path: ${path}`);
    }
  }

  return segments;
};

const MISSING_PATH = Symbol("missing-settings-path");

const readPath = (
  value: SettingsJsonRecord,
  path: string,
): typeof Schema.Json.Type | undefined | typeof MISSING_PATH => {
  let currentValue: typeof Schema.Json.Type | undefined = value;

  for (const segment of path.split(".")) {
    if (!isSettingsRecord(currentValue) || !(segment in currentValue)) {
      return MISSING_PATH;
    }

    currentValue = currentValue[segment];
  }

  return currentValue;
};

export const getPath = (
  value: SettingsJsonRecord,
  path: string,
): typeof Schema.Json.Type | undefined => {
  const result = readPath(value, path);

  return result === MISSING_PATH ? undefined : result;
};

export const hasPath = (value: SettingsJsonRecord, path: string) =>
  readPath(value, path) !== MISSING_PATH;

export const setPath = (
  target: SettingsJsonRecord,
  path: string,
  value: typeof Schema.Json.Type,
) => {
  const segments = splitWritablePath(path);
  const finalSegment = segments.pop();

  if (!finalSegment) {
    return;
  }

  let currentTarget = target;

  for (const segment of segments) {
    const nestedValue = currentTarget[segment];
    const child = isSettingsRecord(nestedValue) ? nestedValue : {};
    currentTarget[segment] = child;
    currentTarget = child;
  }

  currentTarget[finalSegment] = structuredClone(value);
};

export const unsetPath = (target: SettingsJsonRecord, path: string) => {
  const segments = splitWritablePath(path);
  const finalSegment = segments.pop();

  if (!finalSegment) {
    return;
  }

  const parents: Array<{ parent: SettingsJsonRecord; segment: string }> = [];
  let currentTarget = target;

  for (const segment of segments) {
    const nestedValue = currentTarget[segment];

    if (!isSettingsRecord(nestedValue)) {
      return;
    }

    parents.push({ parent: currentTarget, segment });
    currentTarget = nestedValue;
  }

  delete currentTarget[finalSegment];

  for (const { parent, segment } of parents.reverse()) {
    const nestedValue = parent[segment];

    if (
      isSettingsRecord(nestedValue) &&
      Object.keys(nestedValue).length === 0
    ) {
      delete parent[segment];
    }
  }
};

export const collectLeafPaths = (
  value: SettingsJsonRecord,
  prefix = "",
): Array<{ path: string; value: typeof Schema.Json.Type }> => {
  const paths: Array<{ path: string; value: typeof Schema.Json.Type }> = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isSettingsRecord(nestedValue)) {
      const nestedPaths = collectLeafPaths(nestedValue, path);

      if (nestedPaths.length > 0) {
        paths.push(...nestedPaths);
        continue;
      }
    }

    paths.push({ path, value: nestedValue });
  }

  return paths;
};

export const pathsOverlap = (leftPath: string, rightPath: string) =>
  leftPath === rightPath ||
  leftPath.startsWith(`${rightPath}.`) ||
  rightPath.startsWith(`${leftPath}.`);
