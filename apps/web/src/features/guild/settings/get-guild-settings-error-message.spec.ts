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
    "errors.guilds.vanityUrlTaken",
    "Ten skrócony link jest już zajęty. Wybierz inną nazwę.",
  ],
  ["errors.guilds.vanityUrlRestricted", settings.general.vanityUrl.restricted],
  [
    "errors.guilds.reservations.durationRangeInvalid",
    "Minimalny czas rezerwacji nie może przekraczać maksymalnego.",
  ],
])("translates organization setting rejection %s", (message, expected) => {
  const error = new ApiError({
    data: { message },
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
