import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import {
  useGuildTimersDocuments,
  useSettingsDocuments,
} from "@/features/settings/persistence/use-settings-documents";
import { getGuildIds } from "@/lib/api/generated-helpers";
import {
  getGuildTimerListsFromDocuments,
  getTimerAppearanceFromDocuments,
  getTimerBehaviorFromDocuments,
  GLOBAL_TIMER_SETTINGS_KEY,
  type GuildTimerLists,
} from "./timer-settings-documents";

const ACCESSIBLE_GUILDS_STALE_TIME_MS = 5 * 60 * 1000;

/** Behaviour settings of the timers feature, read from the user documents. */
export const useTimerBehaviorSettings = () => {
  const documents = useSettingsDocuments();

  return {
    behavior: getTimerBehaviorFromDocuments(documents.data),
    ready: documents.data !== undefined,
    isError: documents.isError,
  };
};

export const useTimerAppearanceSettings = () => {
  const documents = useSettingsDocuments();

  return {
    appearance: getTimerAppearanceFromDocuments(documents.data),
    ready: documents.data !== undefined,
  };
};

const useAccessibleGuildIds = () => {
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: ACCESSIBLE_GUILDS_STALE_TIME_MS,
    },
  });

  return getGuildIds(guilds);
};

/**
 * Hidden and pinned timers of a settings key: the user document when timers
 * are grouped (`global`), otherwise that organization's document from the
 * batched guild request.
 */
export const useGuildTimerLists = (settingsKey: string): GuildTimerLists => {
  const documents = useSettingsDocuments();
  const guildIds = useAccessibleGuildIds();
  const guildDocuments = useGuildTimersDocuments(guildIds);

  if (settingsKey === GLOBAL_TIMER_SETTINGS_KEY) {
    return getGuildTimerListsFromDocuments(documents.data);
  }

  return getGuildTimerListsFromDocuments(
    guildDocuments.data?.guilds[settingsKey],
  );
};
