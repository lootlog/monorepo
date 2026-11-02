import { normalizeNotificationMutes } from "@lootlog/domain/account-preferences";
import type {
  NotificationMutes,
  NotificationMutesPatch,
} from "@lootlog/schema/user-preferences";
import {
  memoizeByDocuments,
  selectSettingsValue,
  type SettingsDocuments,
} from "./settings-documents";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "./settings-patch-client";
import { useSettingsDocuments } from "./use-settings-documents";

const emptyMutes = normalizeNotificationMutes(undefined);

const projectMutes = memoizeByDocuments((documents) =>
  normalizeNotificationMutes(
    selectSettingsValue(documents, "notifications.mutes"),
  ),
);

const getNotificationMutesFromDocuments = (
  documents: SettingsDocuments | undefined,
): NotificationMutes => (documents ? projectMutes(documents) : emptyMutes);

export const useCurrentUserNotificationMutes = () => {
  const query = useSettingsDocuments();

  return {
    isReady: query.isFetched,
    mutes: getNotificationMutesFromDocuments(query.data),
  };
};

/** Replaces the muted player or NPC list on the user document. */
export const useUpdateNotificationMutes = () => {
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

  return { mutate, mutateFromCurrent };
};
