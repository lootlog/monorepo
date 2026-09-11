import { BattlePanelSettingsTab } from "@/features/settings/components/battle-panel/battle-panel-settings-tab";
import { CatchingSettings } from "@/features/settings/components/catching/catching-settings";
import { ChatAppearanceSettingsForm } from "@/features/settings/components/chat/chat-appearance-settings";
import { ChatFiltersSettings } from "@/features/settings/components/chat/chat-filters-settings";
import { DebugTab } from "@/features/settings/components/debug/debug-tab";
import { DetectorRoutingSettingsTab } from "@/features/settings/components/detector/detector-routing-settings-tab";
import { DetectorSettingsTab } from "@/features/settings/components/detector/detector-settings-tab";
import { ExperimentalSettingsTab } from "@/features/settings/components/experimental/experimental-settings-tab";
import { GeneralSettingsTab } from "@/features/settings/components/general/general-settings-tab";
import { HiddenTimersTab } from "@/features/settings/components/hidden-timers/hidden-timers-tab";
import { HotkeysSettingsTab } from "@/features/settings/components/hotkeys/hotkeys-settings-tab";
import { InterfaceSettingsTab } from "@/features/settings/components/appearance/interface-settings-tab";
import { InformationSettingsTab } from "@/features/settings/components/information/information-settings-tab";
import { LogsSettingsTab } from "@/features/settings/components/logs/logs-settings-tab";
import { NotificationMutesSettingsTab } from "@/features/settings/components/notification-mutes/notification-mutes-settings-tab";
import { NotificationsSettingsTab } from "@/features/settings/components/notifications/notifications-settings-tab";
import { SoundsSettingsTab } from "@/features/settings/components/sounds/sounds-settings-tab";
import { ServerVisibilitySettingsTab } from "@/features/settings/components/servers/server-visibility-settings-tab";
import { NpcColorsSettings } from "@/features/settings/components/npc-colors/npc-colors-settings";
import { TimersSettingsAppearance } from "@/features/settings/components/timers/timers-settings-appearance";
import { TimersSettingsColors } from "@/features/settings/components/timers/timers-settings-colors";
import { TimersSettingsGeneral } from "@/features/settings/components/timers/timers-settings-general";
import type { SettingsSubsectionValue } from "@/features/settings/constants/settings-tabs";
import type { SettingsIconName } from "@/features/settings/settings-manifest";
import {
  Activity,
  Bell,
  Clock,
  FlaskConical,
  Info,
  Keyboard,
  MessageSquare,
  Palette,
  Settings,
  Swords,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Runtime registry that pairs the data-only manifest with React. It lives
 * apart from the manifest so search and the UI store can import manifest data
 * without pulling every subsection component into their module graph.
 */
export const SETTINGS_DOMAIN_ICONS = {
  settings: Settings,
  palette: Palette,
  messageSquare: MessageSquare,
  clock: Clock,
  bell: Bell,
  swords: Swords,
  volume2: Volume2,
  keyboard: Keyboard,
  flaskConical: FlaskConical,
  activity: Activity,
  info: Info,
} satisfies Record<SettingsIconName, LucideIcon>;

export const SETTINGS_SUBSECTION_CONTENT = {
  visibility: ServerVisibilitySettingsTab,
  catching: CatchingSettings,
  behavior: GeneralSettingsTab,
  "npc-colors": NpcColorsSettings,
  interface: InterfaceSettingsTab,
  "chat-appearance": ChatAppearanceSettingsForm,
  "chat-filters": ChatFiltersSettings,
  "timer-behavior": TimersSettingsGeneral,
  "timer-appearance": TimersSettingsAppearance,
  "timer-colors": TimersSettingsColors,
  "hidden-timers": HiddenTimersTab,
  "notification-rules": NotificationsSettingsTab,
  detector: DetectorSettingsTab,
  routing: DetectorRoutingSettingsTab,
  "notification-mutes": NotificationMutesSettingsTab,
  "battle-panel": BattlePanelSettingsTab,
  sounds: SoundsSettingsTab,
  hotkeys: HotkeysSettingsTab,
  experimental: ExperimentalSettingsTab,
  logs: LogsSettingsTab,
  debug: DebugTab,
  build: InformationSettingsTab,
} satisfies Record<SettingsSubsectionValue, ComponentType>;
