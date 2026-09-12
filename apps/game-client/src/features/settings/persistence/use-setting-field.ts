/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import type {
  ServerSettingsCatalogKey,
  SettingsCatalogValue,
} from "@lootlog/domain/settings-documents";
import { setPath } from "@lootlog/domain/settings-paths";
import {
  getDefaultSettingsScopeType,
  hasStoredSettingsValue,
  selectSettingsSource,
  selectSettingsValue,
  splitSettingsKey,
  type SettingsScopeType,
} from "./settings-documents";
import { enqueueSettingsPatch } from "./settings-patch-client";
import { useSettingsDocuments } from "./use-settings-documents";

type UseSettingFieldOptions = {
  scopeType?: SettingsScopeType;
  afterSave?: () => void;
};

/**
 * Binds one catalog field to the settings documents: the effective value,
 * whether it is stored or the default, and a setter that writes through the
 * shared patch queue with optimistic cache updates.
 */
export const useSettingField = <TKey extends ServerSettingsCatalogKey>(
  key: TKey,
  options: UseSettingFieldOptions = {},
) => {
  const documents = useSettingsDocuments();
  const { domain, field } = splitSettingsKey(key);
  const value = selectSettingsValue(documents.data, key);
  const scopeType = options.scopeType ?? getDefaultSettingsScopeType(key);

  const setValue = (next: SettingsCatalogValue<TKey>) => {
    const set: Record<string, unknown> = {};
    setPath(set, field, next);

    return enqueueSettingsPatch({
      domain,
      set,
      scopeType,
      afterSave: options.afterSave,
    });
  };

  const reset = () =>
    enqueueSettingsPatch({ domain, unset: [field], scopeType });

  return {
    value,
    setValue,
    reset,
    source: selectSettingsSource(documents.data, key),
    isDefault: !hasStoredSettingsValue(documents.data, key),
    ready: documents.data !== undefined,
    isLoading: documents.isLoading,
    isError: documents.isError,
  };
};
