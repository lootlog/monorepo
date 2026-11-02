import { ApiError } from "@lootlog/client/transport";
import i18next from "i18next";
import { expect, it } from "vitest";
import settings from "@/i18n/translations/settings.json";
import { getGuildSettingsErrorMessage } from "./get-guild-settings-error-message";

const translations = i18next.createInstance();

await translations.init({
  lng: "pl",
  resources: { pl: { translation: { settings } } },
});

it.each([
  [
    "GUILDS_VANITY_URL_TAKEN",
    "Ten skrócony link jest już zajęty. Wybierz inną nazwę.",
  ],
  ["GUILDS_VANITY_URL_RESTRICTED", settings.general.vanityUrl.restricted],
  ["GUILDS_VANITY_URL_INVALID", settings.general.vanityUrl.invalid],
  [
    "GUILDS_RESERVATION_DURATION_RANGE_INVALID",
    "Minimalny czas rezerwacji nie może przekraczać maksymalnego.",
  ],
])("translates organization setting rejection %s", (code, expected) => {
  const error = new ApiError({
    data: { code },
    message: "Conflict",
    status: 409,
    method: "PATCH",
    url: "/guilds/test",
  });

  expect(getGuildSettingsErrorMessage(error, translations.t)).toBe(expected);
});

it("leaves unknown failures to the form's fallback", () => {
  expect(
    getGuildSettingsErrorMessage(new Error("private details"), translations.t),
  ).toBeUndefined();
});
