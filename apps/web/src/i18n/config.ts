import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import itemRarity from "./translations/item-rarity.json";
import itemType from "./translations/item-type.json";
import npcType from "@lootlog/ui/i18n/translations/npc-type.json";
import permissions from "./translations/permissions.json";
import professions from "@lootlog/ui/i18n/translations/professions.json";
import battle from "@lootlog/battle-ui/i18n/translations/battle.json";
import battlePanel from "./translations/battle-panel.json";
import battleUi from "@lootlog/battle-ui/i18n/translations/battle-ui.json";
import common from "./translations/common.json";
import statistics from "./translations/statistics.json";
import kills from "./translations/kills.json";
import loots from "./translations/loots.json";
import reservations from "./translations/reservations.json";
import timers from "./translations/timers.json";
import activityLogs from "./translations/activity-logs.json";
import auth from "./translations/auth.json";
import layout from "./translations/layout.json";
import ui from "./translations/ui.json";
import docs from "./translations/docs.json";
import heroSightings from "./translations/hero-sightings.json";
import bingo from "./translations/bingo.json";

i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: {
        itemRarity,
        itemType,
        npcType,
        permissions,
        professions,
        battle,
        battlePanel,
        battleUi,
        common,
        kills,
        statistics,
        loots,
        reservations,
        timers,
        activityLogs,
        auth,
        layout,
        ui,
        docs,
        heroSightings,
        bingo,
      },
    },
  },
  lng: "pl",
  fallbackLng: "pl",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  pluralSeparator: "_",
  returnNull: false,
});

export default i18n;

let authenticatedTranslations: Promise<void> | undefined;

export function loadAuthenticatedTranslations() {
  authenticatedTranslations ??= Promise.all([
    import("./translations/settings.json"),
    import("./translations/events.json"),
  ])
    .then(([settings, events]) => {
      i18n.addResourceBundle(
        "pl",
        "translation",
        {
          settings: settings.default,
          events: events.default,
        },
        true,
        true,
      );
    })
    .catch((cause: unknown) => {
      authenticatedTranslations = undefined;
      throw cause;
    });

  return authenticatedTranslations;
}
