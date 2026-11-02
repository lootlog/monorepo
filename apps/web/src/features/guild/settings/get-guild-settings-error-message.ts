import { getApiErrorStringField } from "@lootlog/client/transport";
import type { TFunction } from "i18next";

const errorKeys = new Map([
  ["GUILDS_VANITY_URL_TAKEN", "settings.general.vanityUrl.taken"],
  ["GUILDS_VANITY_URL_RESTRICTED", "settings.general.vanityUrl.restricted"],
  ["GUILDS_VANITY_URL_INVALID", "settings.general.vanityUrl.invalid"],
  [
    "GUILDS_RESERVATION_DURATION_RANGE_INVALID",
    "settings.reservations.durationRangeInvalid",
  ],
]);

export const getGuildSettingsErrorMessage = (cause: unknown, t: TFunction) => {
  const code = getApiErrorStringField(cause, "code");
  const key = code ? errorKeys.get(code) : undefined;

  return key ? t(key) : undefined;
};
