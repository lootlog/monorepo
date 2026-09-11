/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import {
  SETTINGS_CATALOG,
  type ServerSettingsCatalogKey,
  type SettingsCatalogValue,
  type SettingsDomain,
  type SettingsFieldDefinition,
} from "@lootlog/domain/settings-documents";
import {
  cloneValue,
  collectLeafPaths,
  getPath,
  setPath,
  unsetPath,
} from "@lootlog/domain/settings-paths";
import { SETTINGS_DOMAINS } from "@lootlog/schema/settings-documents";
import {
  getSettingsDocumentsControllerGetGuildPreferencesQueryKey,
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  type GuildSettingsDocumentsResponseDtoOutput,
  type PatchSettingsDocumentsDtoOperationsItem,
  type SettingsDocumentsControllerGetGuildPreferencesParams,
  type SettingsDocumentsControllerGetPreferencesParams,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import { isRecord } from "@lootlog/schema/records";

export type SettingsDocuments = SettingsDocumentsResponseDtoOutput;

/** Guild-scoped documents keyed by guild id, from one batched request. */
export type GuildSettingsDocuments = GuildSettingsDocumentsResponseDtoOutput;

export type SettingsScopeType =
  PatchSettingsDocumentsDtoOperationsItem["scope"]["type"];

export type SettingsScope = PatchSettingsDocumentsDtoOperationsItem["scope"];

export type SettingsValueSource = "DEFAULT" | SettingsScope;

export type SettingsOperation = {
  domain: SettingsDomain;
  scope: SettingsScope;
  set: Record<string, unknown>;
  unset: string[];
};

export type SettingsDocumentsContext = {
  gameAccountId?: string;
  characterId?: string;
};

export const ALL_SETTINGS_DOMAINS = SETTINGS_DOMAINS.join(",");

export const getSettingsDocumentsParams = (
  context: SettingsDocumentsContext,
): SettingsDocumentsControllerGetPreferencesParams => {
  const params: SettingsDocumentsControllerGetPreferencesParams = {
    domains: ALL_SETTINGS_DOMAINS,
  };

  if (context.gameAccountId) {
    params.gameAccountId = context.gameAccountId;

    if (context.characterId) params.characterId = context.characterId;
  }

  return params;
};

export const getSettingsDocumentsQueryKey = (
  context: SettingsDocumentsContext,
) =>
  getSettingsDocumentsControllerGetPreferencesQueryKey(
    getSettingsDocumentsParams(context),
  );

export const getGuildTimersDocumentsParams = (
  guildIds: readonly string[],
): SettingsDocumentsControllerGetGuildPreferencesParams => ({
  domains: "timers",
  guildIds: [...new Set(guildIds)].sort().join(","),
});

/** One cache entry holds the timer documents of every accessible guild. */
export const getGuildTimersDocumentsQueryKey = (guildIds: readonly string[]) =>
  getSettingsDocumentsControllerGetGuildPreferencesQueryKey(
    getGuildTimersDocumentsParams(guildIds),
  );

/** Prefix matching every guild documents entry, whatever its guild list. */
export const GUILD_TIMERS_DOCUMENTS_QUERY_KEY_PREFIX =
  getSettingsDocumentsControllerGetGuildPreferencesQueryKey();

export type SettingsKeyParts<TKey extends ServerSettingsCatalogKey> =
  TKey extends `${infer TDomain extends SettingsDomain}.${infer TField}`
    ? { domain: TDomain; field: TField }
    : never;

export const splitSettingsKey = <TKey extends ServerSettingsCatalogKey>(
  key: TKey,
): SettingsKeyParts<TKey> => {
  const separatorIndex = key.indexOf(".");

  // SAFETY: catalog keys are `${domain}.${field}` literals, so the split
  // always yields a catalog domain followed by its field path.
  return {
    domain: key.slice(0, separatorIndex),
    field: key.slice(separatorIndex + 1),
  } as SettingsKeyParts<TKey>;
};

const getFieldDefinition = (
  domain: SettingsDomain,
  field: string,
): SettingsFieldDefinition | undefined => {
  const fields: Readonly<Record<string, SettingsFieldDefinition | undefined>> =
    SETTINGS_CATALOG[domain].fields;

  return fields[field];
};

/**
 * The scope a field is written to unless a caller asks for a wider one:
 * the most specific scope the catalog allows for that field.
 */
export const getDefaultSettingsScopeType = (
  key: ServerSettingsCatalogKey,
): SettingsScopeType => {
  const { domain, field } = splitSettingsKey(key);
  const scopes = getFieldDefinition(domain, field)?.scopes ?? ["USER"];

  if (scopes.includes("CHARACTER")) return "CHARACTER";

  if (scopes.includes("GAME_ACCOUNT")) return "GAME_ACCOUNT";

  return "USER";
};

export const getSettingsDefaultValue = <TKey extends ServerSettingsCatalogKey>(
  key: TKey,
): SettingsCatalogValue<TKey> => {
  const { domain, field } = splitSettingsKey(key);

  // SAFETY: the catalog default for `${domain}.${field}` is typed by
  // SettingsCatalogValue; structuredClone keeps callers from mutating it.
  return cloneValue(
    getFieldDefinition(domain, field)?.defaultValue,
  ) as SettingsCatalogValue<TKey>;
};

export const selectSettingsDomain = (
  documents: SettingsDocuments | undefined,
  domain: SettingsDomain,
) => documents?.domains[domain];

export const selectSettingsValue = <TKey extends ServerSettingsCatalogKey>(
  documents: SettingsDocuments | undefined,
  key: TKey,
): SettingsCatalogValue<TKey> => {
  const { domain, field } = splitSettingsKey(key);
  const effective = selectSettingsDomain(documents, domain)?.effective;
  const value = effective ? getPath(effective, field) : undefined;

  if (value === undefined) return getSettingsDefaultValue(key);

  // SAFETY: the API resolves `effective` through the catalog validator for
  // every field, so a present value already has the field's declared shape.
  return value as SettingsCatalogValue<TKey>;
};

export const selectSettingsSource = (
  documents: SettingsDocuments | undefined,
  key: ServerSettingsCatalogKey,
): SettingsValueSource | undefined => {
  const { domain, field } = splitSettingsKey(key);

  return selectSettingsDomain(documents, domain)?.sources[field];
};

export const hasStoredSettingsValue = (
  documents: SettingsDocuments | undefined,
  key: ServerSettingsCatalogKey,
) => {
  const source = selectSettingsSource(documents, key);

  return source !== undefined && source !== "DEFAULT";
};

const getFieldPathForLeaf = (domain: SettingsDomain, path: string) => {
  const fields = SETTINGS_CATALOG[domain].fields;
  let candidate = path;

  while (candidate) {
    if (candidate in fields) return candidate;
    const separatorIndex = candidate.lastIndexOf(".");

    if (separatorIndex === -1) return undefined;
    candidate = candidate.slice(0, separatorIndex);
  }

  return undefined;
};

/**
 * Mirrors the server patch semantics on a cached response: leaf paths from
 * `set` overwrite the effective values, `unset` paths fall back to defaults,
 * and the touched fields point at the operation scope.
 */
export const applySettingsOperation = (
  documents: SettingsDocuments | undefined,
  operation: SettingsOperation,
): SettingsDocuments | undefined => {
  const resolution = selectSettingsDomain(documents, operation.domain);

  if (!documents || !resolution) return documents;
  const effective = cloneValue(resolution.effective);
  const sources = { ...resolution.sources };

  for (const { path, value } of collectLeafPaths(operation.set)) {
    setPath(effective, path, value);
    const fieldPath = getFieldPathForLeaf(operation.domain, path);

    if (fieldPath) sources[fieldPath] = operation.scope;
  }

  for (const path of operation.unset) {
    unsetPath(effective, path);
    const fieldPath = getFieldPathForLeaf(operation.domain, path);

    if (fieldPath && getPath(effective, fieldPath) === undefined) {
      const definition = getFieldDefinition(operation.domain, fieldPath);

      if (definition) {
        setPath(effective, fieldPath, definition.defaultValue);
      }

      sources[fieldPath] = "DEFAULT";
    }
  }

  return {
    ...documents,
    domains: {
      ...documents.domains,
      [operation.domain]: { ...resolution, effective, sources },
    },
  };
};

/** Applies a GUILD scoped operation to that guild's entry of a batched response. */
export const applyGuildSettingsOperation = (
  documents: GuildSettingsDocuments | undefined,
  operation: SettingsOperation,
): GuildSettingsDocuments | undefined => {
  const current = documents?.guilds[operation.scope.id];

  if (!documents || !current) return documents;

  const next = applySettingsOperation(current, operation) ?? current;

  return next === current
    ? documents
    : { guilds: { ...documents.guilds, [operation.scope.id]: next } };
};

/**
 * Replaces the domains a save response carries and keeps the rest of the
 * cached document, so a response resolved for the same context can stand in
 * for a refetch.
 */
export const mergeSettingsDocuments = (
  current: SettingsDocuments | undefined,
  incoming: SettingsDocuments,
): SettingsDocuments | undefined =>
  current
    ? { ...current, domains: { ...current.domains, ...incoming.domains } }
    : current;

/** Structural equality for catalog-shaped values (plain JSON). */
export const areSettingsValuesEqual = (left: unknown, right: unknown) =>
  left === right || JSON.stringify(left) === JSON.stringify(right);

export const isSettingsRecord = (
  value: unknown,
): value is Record<string, unknown> => isRecord(value);
