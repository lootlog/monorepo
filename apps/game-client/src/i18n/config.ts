import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import backendPreferencesWarning from "./resources/pl/backend-preferences-warning.json";
import catchingWhitelistWarning from "./resources/pl/catching-whitelist-warning.json";
import chat from "./resources/pl/chat.json";
import command from "./resources/pl/command.json";
import common from "./resources/pl/common.json";
import errorBoundary from "./resources/pl/error-boundary.json";
import notifications from "./resources/pl/notifications.json";
import npcDetector from "./resources/pl/npc-detector.json";
import onlinePlayers from "./resources/pl/online-players.json";
import partyFinder from "./resources/pl/party-finder.json";
import quickAccess from "./resources/pl/quick-access.json";
import settingsBattlePanel from "./resources/pl/settings/battle-panel.json";
import settingsCatching from "./resources/pl/settings/catching.json";
import settingsDebug from "./resources/pl/settings/debug.json";
import settingsDetector from "./resources/pl/settings/detector.json";
import settingsGeneral from "./resources/pl/settings/general.json";
import settingsHiddenTimers from "./resources/pl/settings/hidden-timers.json";
import settingsHotkeys from "./resources/pl/settings/hotkeys.json";
import settingsLogs from "./resources/pl/settings/logs.json";
import settingsNotificationMutes from "./resources/pl/settings/notification-mutes.json";
import settingsNotifications from "./resources/pl/settings/notifications.json";
import settingsShared from "./resources/pl/settings/shared.json";
import settingsSounds from "./resources/pl/settings/sounds.json";
import settingsTimers from "./resources/pl/settings/timers.json";
import timers from "./resources/pl/timers.json";

const settings = {
  settings: {
    ...settingsShared,
    general: settingsGeneral,
    battlePanel: settingsBattlePanel,
    hotkeys: settingsHotkeys,
    notifications: settingsNotifications,
    notificationMutes: settingsNotificationMutes,
    detector: settingsDetector,
    timers: settingsTimers,
    catching: settingsCatching,
    hiddenTimers: settingsHiddenTimers,
    sounds: settingsSounds,
    logs: settingsLogs,
    debug: settingsDebug,
  },
} as const;

const featureResources = {
  ...common,
  ...settings,
  ...chat,
  ...command,
  ...onlinePlayers,
  ...quickAccess,
  ...partyFinder,
  ...notifications,
  ...npcDetector,
  ...timers,
  ...errorBoundary,
  ...backendPreferencesWarning,
  ...catchingWhitelistWarning,
} as const;

i18n.use(initReactI18next).init({
  resources: {
    pl: {
      translation: featureResources,
      ...featureResources,
    },
  },
  lng: "pl",
  supportedLngs: ["pl"],
  defaultNS: "translation",
  ns: [
    "translation",
    "common",
    "settings",
    "chat",
    "command",
    "online-players",
    "quick-access",
    "party-finder",
    "notifications",
    "npc-detector",
    "timers",
    "error-boundary",
    "backend-preferences-warning",
    "catching-whitelist-warning",
  ],
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
