import battle from "@lootlog/battle-ui/i18n/translations/battle.json";
import battleUi from "@lootlog/battle-ui/i18n/translations/battle-ui.json";
import i18next, { type i18n } from "i18next";

export const battleI18n: i18n = i18next.createInstance();

void battleI18n.init({
  lng: "pl",
  fallbackLng: "pl",
  resources: { pl: { translation: { battle, battleUi } } },
  interpolation: { escapeValue: false },
  pluralSeparator: "_",
  initAsync: false,
  returnNull: false,
});
