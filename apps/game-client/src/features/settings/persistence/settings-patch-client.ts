/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import { queryClient } from "@/lib/query-client";
import { getFixedT } from "@/i18n/get-fixed-t";
import { useGameStore } from "@/store/game.store";
import {
  getCharacterSettingsScopeId,
  type SettingsDomain,
} from "@lootlog/domain/settings-documents";
import {
  getUsersControllerGetUserPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import type { QueryKey } from "@tanstack/react-query";
import { isRecord } from "@lootlog/schema/records";
import { toast } from "sonner";
import {
  applySettingsOperation,
  getGuildTimersDocumentsQueryKey,
  getSettingsDocumentsQueryKey,
  type SettingsDocuments,
  type SettingsDocumentsContext,
  type SettingsScope,
  type SettingsScopeType,
} from "./settings-documents";
import { createSettingsPatchQueue } from "./settings-patch-queue";
import { useSettingsSaveStatusStore } from "./settings-save-status.store";

export const getCurrentSettingsContext = (): SettingsDocumentsContext => {
  const hero = useGameStore.getState().game?.hero;

  return {
    gameAccountId: hero?.accountId,
    characterId: hero?.characterId,
  };
};

export const getCurrentUserId = () =>
  queryClient.getQueryData<UserPreferencesResponseDtoOutput>(
    getUsersControllerGetUserPreferencesQueryKey(),
  )?.userId;

export const getCurrentSettingsDocumentsQueryKey = () =>
  getSettingsDocumentsQueryKey(getCurrentSettingsContext());

export const readCurrentSettingsDocuments = () =>
  queryClient.getQueryData<SettingsDocuments>(
    getCurrentSettingsDocumentsQueryKey(),
  );

/**
 * Resolves the concrete scope for a patch from the signed-in user and the
 * current character. Returns undefined while that context is unknown.
 */
export const resolveSettingsScope = (
  scopeType: SettingsScopeType,
  guildId?: string,
): SettingsScope | undefined => {
  const context = getCurrentSettingsContext();

  switch (scopeType) {
    case "USER": {
      const userId = getCurrentUserId();

      return userId ? { type: "USER", id: userId } : undefined;
    }

    case "GAME_ACCOUNT":
      return context.gameAccountId
        ? { type: "GAME_ACCOUNT", id: context.gameAccountId }
        : undefined;

    case "CHARACTER":
      return context.gameAccountId && context.characterId
        ? {
            type: "CHARACTER",
            id: getCharacterSettingsScopeId(
              context.gameAccountId,
              context.characterId,
            ),
          }
        : undefined;

    case "GUILD":
      return guildId ? { type: "GUILD", id: guildId } : undefined;
  }
};

export const settingsPatchQueue = createSettingsPatchQueue({
  send: (operations) =>
    settingsDocumentsControllerPatchPreferences({ operations }),
  applyOptimistic: ({ operation, queryKeys }) => {
    for (const queryKey of queryKeys) {
      queryClient.setQueryData<SettingsDocuments>(queryKey, (current) =>
        applySettingsOperation(current, operation),
      );
    }
  },
  reconcile: async (queryKeys) => {
    await Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  },
  onStatus: (status) =>
    useSettingsSaveStatusStore
      .getState()
      .setStatus(status, () => void settingsPatchQueue.retry()),
  onError: () => {
    toast.error(getFixedT("settings")("saveStatus.error"));
  },
});

/** Dotted leaf paths of a patch `set`, e.g. `{ a: { b: 1 } }` -> `["a.b"]`. */
const collectLeafPaths = (
  value: Record<string, unknown>,
  prefix = "",
): string[] =>
  Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return isRecord(nested) && Object.keys(nested).length > 0
      ? collectLeafPaths(nested, path)
      : [path];
  });

export type EnqueueSettingsPatchInput = {
  domain: SettingsDomain;
  set?: Record<string, unknown>;
  unset?: string[];
  scopeType?: SettingsScopeType;
  /** Required for GUILD scoped patches; also selects the guild cache entry. */
  guildId?: string;
  afterSave?: () => void;
};

/**
 * Queues a settings write against the current user/character context.
 * Returns false when the context is not known yet and the write was dropped.
 */
export const enqueueSettingsPatch = ({
  domain,
  set = {},
  unset = [],
  scopeType = "USER",
  guildId,
  afterSave,
}: EnqueueSettingsPatchInput): boolean => {
  const scope = resolveSettingsScope(scopeType, guildId);

  if (!scope || (Object.keys(set).length === 0 && unset.length === 0)) {
    return false;
  }

  const queryKeys: QueryKey[] =
    scope.type === "GUILD"
      ? [getGuildTimersDocumentsQueryKey(scope.id)]
      : [getCurrentSettingsDocumentsQueryKey()];

  const settingKeys = [...collectLeafPaths(set), ...unset].map(
    (path) => `${domain}.${path}`,
  );

  const saveStatusStore = useSettingsSaveStatusStore.getState();
  saveStatusStore.markKeys(settingKeys, "saving");

  settingsPatchQueue.enqueue({
    operation: { domain, scope, set, unset },
    queryKeys,
    afterSave: () => {
      saveStatusStore.markKeys(settingKeys, "saved");
      afterSave?.();
    },
  });

  return true;
};
