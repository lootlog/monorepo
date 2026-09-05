import { getApiErrorMessage } from "@lootlog/client/transport";
import type { TFunction } from "i18next";

const errorKeys: Record<string, string> = {
  "errors.guilds.vanityUrlTaken": "settings.general.vanityUrl.taken",
  "errors.guilds.vanityUrlRestricted": "settings.general.vanityUrl.restricted",
  "errors.guilds.reservations.durationRangeInvalid":
    "settings.reservations.durationRangeInvalid",
};

export const getGuildSettingsErrorMessage = (error: unknown, t: TFunction) => {
  const message = getApiErrorMessage(error);
  const key = message ? errorKeys[message] : undefined;
  return key ? t(key) : undefined;
};
