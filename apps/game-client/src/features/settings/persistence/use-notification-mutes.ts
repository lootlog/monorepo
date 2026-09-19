import { normalizeNotificationMutes } from "@lootlog/domain/account-preferences";
import type {
  NotificationMutes,
  NotificationMutesPatch,
} from "@lootlog/schema/user-preferences";
import {
  selectSettingsValue,
  type SettingsDocuments,
} from "./settings-documents";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "./settings-patch-client";
import { useSettingsSaveStatus } from "./settings-save-status.store";
import { useSettingsDocuments } from "./use-settings-documents";

const mutesCache = new WeakMap<SettingsDocuments, NotificationMutes>();

const emptyMutes = normalizeNotificationMutes(undefined);

export const getNotificationMutesFromDocuments = (
  documents: SettingsDocuments | undefined,
): NotificationMutes => {
  if (!documents) return emptyMutes;
  const cached = mutesCache.get(documents);

  if (cached) return cached;

  const mutes = normalizeNotificationMutes(
    selectSettingsValue(documents, "notifications.mutes"),
  );

  mutesCache.set(documents, mutes);

  return mutes;
};

export const useCurrentUserNotificationMutes = () => {
  const query = useSettingsDocuments();

  return {
    isReady: query.isFetched,
    mutes: getNotificationMutesFromDocuments(query.data),
  };
};

/** Replaces the muted player or NPC list on the user document. */
export const useUpdateNotificationMutes = () => {
  const status = useSettingsSaveStatus();

  const mutate = (patch: NotificationMutesPatch) => {
    const mutes: NotificationMutesPatch = {};

    if (patch.players) mutes.players = patch.players;

    if (patch.npcs) mutes.npcs = patch.npcs;

    enqueueSettingsPatch({ domain: "notifications", set: { mutes } });
  };

  /**
   * Builds the patch from the mutes as they are in the cache right now,
   * pending patches included, so a removal derived from them never restores
   * an entry that an earlier click has already removed.
   */
  const mutateFromCurrent = (
    updater: (current: NotificationMutes) => NotificationMutesPatch,
  ) =>
    mutate(
      updater(
        getNotificationMutesFromDocuments(readCurrentSettingsDocuments()),
      ),
    );

  return { mutate, mutateFromCurrent, isPending: status === "saving" };
};
