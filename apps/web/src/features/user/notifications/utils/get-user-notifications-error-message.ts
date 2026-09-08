import type { TOptions } from "i18next";
import { getApiErrorMessage } from "@lootlog/client/transport";
import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user/notifications/constants/user-watched-items-limit";

type TranslateFunction = (key: string, options?: TOptions) => string;

export const getUserNotificationsErrorMessage = (
  cause: unknown,
  t: TranslateFunction,
) => {
  const apiMessage = getApiErrorMessage(cause);

  if (apiMessage === "ACTIVE_DISCORD_DM_TARGET_REQUIRED") {
    return t("settings.userNotifications.validation.dmRequired");
  }

  if (apiMessage === "SELECTED_GUILDS_NOT_AVAILABLE_FOR_AUTHENTICATED_USER") {
    return t("settings.userNotifications.validation.guildSelectionUnavailable");
  }

  if (apiMessage === "USER_DM_TEST_TRIGGER_LIMIT_REACHED") {
    return t("settings.userNotifications.validation.dmTestLimitReached");
  }

  if (apiMessage === "USER_WATCHED_ITEM_LIMIT_REACHED") {
    return t("settings.userNotifications.validation.watchLimitReached", {
      limit: USER_WATCHED_ITEMS_LIMIT,
    });
  }

  return apiMessage;
};
