import { queryClient } from "@/lib/query-client";
import type { ServerSettingsCatalogKey } from "@lootlog/domain/settings-documents";
import { selectSettingsValue } from "./settings-documents";
import {
  getCurrentSettingsDocumentsQueryKey,
  readCurrentSettingsDocuments,
} from "./settings-patch-client";

/** Non-React read of one setting for processors and runtime adapters. */
export const readSettingsValue = <TKey extends ServerSettingsCatalogKey>(
  key: TKey,
) => selectSettingsValue(readCurrentSettingsDocuments(), key);

/**
 * True once the current settings documents were fetched or the fetch failed,
 * so callers can stop waiting for a value that will not arrive.
 */
export const areSettingsDocumentsSettled = () => {
  const queryKey = getCurrentSettingsDocumentsQueryKey();

  if (queryClient.getQueryData(queryKey)) return true;

  return queryClient.getQueryState(queryKey)?.status === "error";
};
