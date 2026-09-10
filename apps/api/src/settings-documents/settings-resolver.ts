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

import {
  cloneValue,
  collectLeafPaths,
  getPath,
  hasPath,
  pathsOverlap,
  setPath,
  unsetPath,
  type SettingsJsonRecord,
} from "@lootlog/domain/settings-paths";

export type JsonRecord = SettingsJsonRecord;

interface ApplySettingsPatchInput {
  domain: SettingsDomain;
  scope: SettingsScope;
  currentOverrides: JsonRecord;
  set: JsonRecord;
  unset: ReadonlyArray<string>;
}

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
    .flatMap((layer) =>
      layer.updatedAt === undefined ? [] : [layer.updatedAt],
    )
    .sort((left, right) => left.getTime() - right.getTime());

  const updatedAt = updatedValues[updatedValues.length - 1];

  const resolution: SettingsDomainResolution = {
    effective,
    layers: migratedLayers,
    sources,
    schemaVersion: definition.schemaVersion,
  };

  if (updatedAt) return { ...resolution, updatedAt };

  return resolution;
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
