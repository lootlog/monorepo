import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import itemStats from "./translations/item-stats.json";
import itemRarity from "./translations/item-rarity.json";
import itemType from "./translations/item-type.json";
import npcType from "./translations/npc-type.json";
import permissions from "./translations/permissions.json";
import professions from "./translations/professions.json";
import battle from "./translations/battle.json";
import battlePanel from "./translations/battle-panel.json";
import battleUi from "./translations/battle-ui.json";
import events from "./translations/events.json";
import settings from "./translations/settings.json";
import common from "./translations/common.json";
import kills from "./translations/kills.json";
import loots from "./translations/loots.json";
import reservations from "./translations/reservations.json";
import timers from "./translations/timers.json";
import activityLogs from "./translations/activity-logs.json";
import auth from "./translations/auth.json";
import layout from "./translations/layout.json";
import ui from "./translations/ui.json";

i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: {
        itemStats,
        itemRarity,
        itemType,
        npcType,
        permissions,
        professions,
        battle,
        battlePanel,
        battleUi,
        events,
        settings,
        common,
        kills,
        loots,
        reservations,
        timers,
        activityLogs,
        auth,
        layout,
        ui,
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
