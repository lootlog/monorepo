import auth from "./auth.json";
import backendPreferencesWarning from "./backend-preferences-warning.json";
import battlePanel from "./battle-panel.json";
import catching from "./catching.json";
import chat from "./chat.json";
import command from "./command.json";
import common from "./common.json";
import debug from "./debug.json";
import detector from "./detector.json";
import errorBoundary from "./error-boundary.json";
import general from "./general.json";
import hiddenTimers from "./hidden-timers.json";
import hotkeys from "./hotkeys.json";
import logs from "./logs.json";
import notificationMutes from "./notification-mutes.json";
import notifications from "./notifications.json";
import partyFinder from "./party-finder.json";
import quickAccess from "./quick-access.json";
import sounds from "./sounds.json";
import timerSettingsConflict from "./timer-settings-conflict.json";
import timers from "./timers.json";
import worldSelector from "./world-selector.json";

const settings = {
  ...common,
  quickAccess,
  worldSelector,
  command,
  backendPreferencesWarning,
  timerSettingsConflict,
  errorBoundary,
  partyFinder,
  chat,
  auth,
  general,
  battlePanel,
  hotkeys,
  notifications,
  notificationMutes,
  detector,
  timers,
  catching,
  hiddenTimers,
  sounds,
  logs,
  debug,
};

export default settings;
