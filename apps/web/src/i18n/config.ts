import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import itemStats from "./translations/item-stats.json";
import itemRarity from "./translations/item-rarity.json";
import itemType from "./translations/item-type.json";
import npcType from "./translations/npc-type.json";
import permissions from "./translations/permissions.json";
import professions from "./translations/professions.json";
import battle from "./translations/battle.json";
import events from "./translations/events.json";
import settings from "./translations/settings.json";
import common from "./translations/common.json";
import kills from "./translations/kills.json";

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
        events,
        settings,
        common,
        kills,
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
