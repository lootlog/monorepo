import { getApiErrorMessage } from "@lootlog/client/transport";
import type { TFunction } from "i18next";

const errorKeys = new Map([
  ["errors.guilds.vanityUrlTaken", "settings.general.vanityUrl.taken"],
  [
    "errors.guilds.vanityUrlRestricted",
    "settings.general.vanityUrl.restricted",
  ],
  [
    "errors.guilds.reservations.durationRangeInvalid",
    "settings.reservations.durationRangeInvalid",
  ],
]);

export const getGuildSettingsErrorMessage = (cause: unknown, t: TFunction) => {
  const message = getApiErrorMessage(cause);
  const key = message ? errorKeys.get(message) : undefined;
  return key ? t(key) : undefined;
};
