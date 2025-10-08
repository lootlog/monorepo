import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import itemStats from "./translations/item-stats.json";
import itemRarity from "./translations/item-rarity.json";
import npcType from "./translations/npc-type.json";
import permissions from "./translations/permissions.json";
import professions from "./translations/professions.json";
import battle from "@lootlog/ui/i18n/translations/battle.json";

i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: {
        itemStats,
        itemRarity,
        npcType,
        permissions,
        professions,
        battle,
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
});
