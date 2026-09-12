/* oxlint-disable anti-slop/no-unknown-returns, anti-slop/no-unknown-parameters, anti-slop/no-unsafe-dictionary-type -- generic JSON path utilities operate on unparsed document overrides by design; callers validate values against the settings catalog. */
import { isRecord } from "@lootlog/schema/records";

// Dotted-path helpers shared by the API resolver and the Game client cache.
export type SettingsJsonRecord = Record<string, unknown>;

export const cloneValue = <TValue>(value: TValue): TValue =>
  structuredClone(value);

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

export const getPath = (value: SettingsJsonRecord, path: string): unknown => {
  let currentValue: unknown = value;

  for (const segment of path.split(".")) {
    if (!isRecord(currentValue) || !(segment in currentValue)) {
      return undefined;
    }

    currentValue = currentValue[segment];
  }

  return currentValue;
};

export const hasPath = (value: SettingsJsonRecord, path: string) => {
  const segments = path.split(".");
  let currentValue: unknown = value;

  for (const segment of segments) {
    if (!isRecord(currentValue) || !(segment in currentValue)) {
      return false;
    }

    currentValue = currentValue[segment];
  }

  return true;
};

export const setPath = (
  target: SettingsJsonRecord,
  path: string,
  value: unknown,
) => {
  const segments = splitWritablePath(path);
  const finalSegment = segments.pop();

  if (!finalSegment) {
    return;
  }

  let currentTarget = target;

  for (const segment of segments) {
    const nestedValue = currentTarget[segment];
    const child = isRecord(nestedValue) ? nestedValue : {};
    currentTarget[segment] = child;
    currentTarget = child;
  }

  currentTarget[finalSegment] = cloneValue(value);
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

    if (!isRecord(nestedValue)) {
      return;
    }

    parents.push({ parent: currentTarget, segment });
    currentTarget = nestedValue;
  }

  delete currentTarget[finalSegment];

  for (const { parent, segment } of parents.reverse()) {
    const nestedValue = parent[segment];

    if (isRecord(nestedValue) && Object.keys(nestedValue).length === 0) {
      delete parent[segment];
    }
  }
};

export const collectLeafPaths = (
  value: SettingsJsonRecord,
  prefix = "",
): Array<{ path: string; value: unknown }> => {
  const paths: Array<{ path: string; value: unknown }> = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isRecord(nestedValue)) {
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
