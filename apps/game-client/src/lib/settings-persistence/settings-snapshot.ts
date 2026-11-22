import { queryClient } from "@/lib/query-client";
import type { ServerSettingsCatalogKey } from "@lootlog/domain/settings-documents";
import { selectSettingsValue } from "./settings-documents";
import {
  getCurrentSettingsDocumentsQueryKey,
  readCurrentSettingsDocuments,
} from "./settings-patch-client";

export const readSettingsValue = <TKey extends ServerSettingsCatalogKey>(
  key: TKey,
) => selectSettingsValue(readCurrentSettingsDocuments(), key);

export const areSettingsDocumentsSettled = () => {
  const queryKey = getCurrentSettingsDocumentsQueryKey();

  if (queryClient.getQueryData(queryKey)) return true;

  return queryClient.getQueryState(queryKey)?.status === "error";
};
