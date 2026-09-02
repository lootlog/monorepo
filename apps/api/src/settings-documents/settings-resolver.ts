import {
  migrateSettingsDocument,
  SETTINGS_CATALOG,
} from "@lootlog/domain/settings-documents";
import type {
  SettingsDocumentLayer,
  SettingsDomain,
  SettingsDomainResolution,
  SettingsScope,
  SettingsValueSource,
} from "@lootlog/schema/settings-documents";

type JsonRecord = Record<string, unknown>;

interface ApplySettingsPatchInput {
  domain: SettingsDomain;
  scope: SettingsScope;
  currentOverrides: JsonRecord;
  set: JsonRecord;
  unset: string[];
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneValue = <TValue>(value: TValue): TValue => structuredClone(value);

const getPath = (value: JsonRecord, path: string): unknown => {
  let currentValue: unknown = value;

  for (const segment of path.split(".")) {
    if (!isRecord(currentValue) || !(segment in currentValue)) {
      return undefined;
    }

    currentValue = currentValue[segment];
  }

  return currentValue;
};

const hasPath = (value: JsonRecord, path: string) => {
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

const setPath = (target: JsonRecord, path: string, value: unknown) => {
  const segments = path.split(".");
  const finalSegment = segments.pop();

  if (!finalSegment) {
    return;
  }

  let currentTarget = target;
  for (const segment of segments) {
    const nestedValue = currentTarget[segment];
    if (!isRecord(nestedValue)) {
      currentTarget[segment] = {};
    }
    currentTarget = currentTarget[segment] as JsonRecord;
  }

  currentTarget[finalSegment] = cloneValue(value);
};

const unsetPath = (target: JsonRecord, path: string) => {
  const segments = path.split(".");
  const finalSegment = segments.pop();

  if (!finalSegment) {
    return;
  }

  const parents: Array<{ parent: JsonRecord; segment: string }> = [];
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

const collectLeafPaths = (
  value: JsonRecord,
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

const pathsOverlap = (leftPath: string, rightPath: string) =>
  leftPath === rightPath ||
  leftPath.startsWith(`${rightPath}.`) ||
  rightPath.startsWith(`${leftPath}.`);

const getFieldDefinition = (domain: SettingsDomain, path: string) => {
  const fields = SETTINGS_CATALOG[domain].fields;
  const exactDefinition = fields[path];
  if (exactDefinition) {
    return { definition: exactDefinition, fieldPath: path };
  }

  const ancestorPath = Object.keys(fields)
    .filter((candidatePath) => path.startsWith(`${candidatePath}.`))
    .sort((left, right) => right.length - left.length)[0];

  if (!ancestorPath) {
    return undefined;
  }

  return {
    definition: fields[ancestorPath],
    fieldPath: ancestorPath,
  };
};

export const resolveSettingsDomain = (
  domain: SettingsDomain,
  layers: SettingsDocumentLayer[],
): SettingsDomainResolution => {
  const definition = SETTINGS_CATALOG[domain];
  const effective: JsonRecord = {};
  const sources: Record<string, SettingsValueSource> = {};
  const migratedLayers = layers.map((layer) => ({
    ...layer,
    overrides: migrateSettingsDocument(
      domain,
      layer.overrides,
      layer.schemaVersion ?? definition.schemaVersion,
    ),
    schemaVersion: definition.schemaVersion,
  }));

  for (const [path, fieldDefinition] of Object.entries(definition.fields)) {
    setPath(effective, path, fieldDefinition.defaultValue);
    sources[path] = "DEFAULT";

    for (const layer of migratedLayers) {
      if (
        !fieldDefinition.scopes.includes(layer.scope.type) ||
        !hasPath(layer.overrides, path)
      ) {
        continue;
      }

      const candidateValue = getPath(layer.overrides, path);
      if (!fieldDefinition.isValid(candidateValue)) {
        continue;
      }

      setPath(effective, path, candidateValue);
      sources[path] = layer.scope;
    }
  }

  const updatedValues = migratedLayers
    .map((layer) => layer.updatedAt)
    .filter((value): value is string => value !== undefined)
    .sort();
  const updatedAt = updatedValues[updatedValues.length - 1];

  return {
    effective,
    layers: migratedLayers,
    sources,
    schemaVersion: definition.schemaVersion,
    ...(updatedAt ? { updatedAt } : {}),
  };
};

export const applySettingsPatch = ({
  domain,
  scope,
  currentOverrides,
  set,
  unset,
}: ApplySettingsPatchInput): JsonRecord => {
  const setEntries = collectLeafPaths(set);
  const setPaths = setEntries.map(({ path }) => path);

  for (const setPathValue of setPaths) {
    if (
      unset.some((unsetPathValue) => pathsOverlap(setPathValue, unsetPathValue))
    ) {
      throw new Error("A setting cannot be present in both set and unset");
    }
  }

  const nextOverrides = cloneValue(currentOverrides);

  for (const { path, value } of setEntries) {
    const fieldMatch = getFieldDefinition(domain, path);
    if (!fieldMatch) {
      throw new Error(`Unknown setting path: ${path}`);
    }
    if (!fieldMatch.definition.scopes.includes(scope.type)) {
      throw new Error(
        `Setting ${path} is not available for scope ${scope.type}`,
      );
    }
    if (
      fieldMatch.fieldPath === path &&
      !fieldMatch.definition.isValid(value)
    ) {
      throw new Error(`Invalid value for setting ${path}`);
    }
    setPath(nextOverrides, path, value);
  }

  for (const path of unset) {
    const fieldMatch = getFieldDefinition(domain, path);
    if (!fieldMatch) {
      throw new Error(`Unknown setting path: ${path}`);
    }
    if (!fieldMatch.definition.scopes.includes(scope.type)) {
      throw new Error(
        `Setting ${path} is not available for scope ${scope.type}`,
      );
    }
    unsetPath(nextOverrides, path);
  }

  return nextOverrides;
};
