import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import backendPreferencesWarning from "./translations/backend-preferences-warning.json";
import catchingWhitelistWarning from "./translations/catching-whitelist-warning.json";
import chat from "./translations/chat.json";
import command from "./translations/command.json";
import common from "./translations/common.json";
import errorBoundary from "./translations/error-boundary.json";
import eventMode from "./translations/event-mode.json";
import notifications from "./translations/notifications.json";
import npcDetector from "./translations/npc-detector.json";
import onlinePlayers from "./translations/online-players.json";
import partyFinder from "./translations/party-finder.json";
import quickAccess from "./translations/quick-access.json";
import settings from "./translations/settings.json";
import timers from "./translations/timers.json";

i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: {
        common,
        chat,
        command,
        onlinePlayers,
        quickAccess,
        catchingWhitelistWarning,
        backendPreferencesWarning,
        errorBoundary,
        eventMode,
        npcDetector,
        notifications,
        partyFinder,
        settings,
        timers,
      },
      common,
      chat,
      command,
      onlinePlayers,
      quickAccess,
      catchingWhitelistWarning,
      backendPreferencesWarning,
      errorBoundary,
      eventMode,
      npcDetector,
      notifications,
      partyFinder,
      settings,
      timers,
    },
  },
  lng: "pl",
  supportedLngs: ["pl"],
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
