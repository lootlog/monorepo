import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BattlePanelSettingsTab } from "@/features/settings/components/battle-panel/battle-panel-settings-tab";
import { CatchingSettings } from "@/features/settings/components/catching/catching-settings";
import { DebugTab } from "@/features/settings/components/debug/debug-tab";
import { DetectorSettingsTab } from "@/features/settings/components/detector/detector-settings-tab";
import { GeneralSettingsTab } from "@/features/settings/components/general/general-settings-tab";
import { HiddenTimersTab } from "@/features/settings/components/hidden-timers/hidden-timers-tab";
import { HotkeysSettingsTab } from "@/features/settings/components/hotkeys/hotkeys-settings-tab";
import { InformationSettingsTab } from "@/features/settings/components/information/information-settings-tab";
import { LogsSettingsTab } from "@/features/settings/components/logs/logs-settings-tab";
import { NotificationMutesSettingsTab } from "@/features/settings/components/notification-mutes/notification-mutes-settings-tab";
import { NotificationsSettingsTab } from "@/features/settings/components/notifications/notifications-settings-tab";
import { SoundsSettingsTab } from "@/features/settings/components/sounds/sounds-settings-tab";
import { TimersSettingsTab } from "@/features/settings/components/timers/timers-settings-tab";
import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";
import { useWindowsStore } from "@/store/windows.store";
import {
  Bell,
  BellOff,
  Bug,
  Clock,
  Crosshair,
  EyeOff,
  FileText,
  Info,
  Keyboard,
  Settings,
  Swords,
  Target,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type SettingsTabDefinition = {
  value: SettingsTabValue;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
};

const ICON_CLASSES = "ll:size-4 ll:stroke-2";
const SETTINGS_TABS_COMPACT_WIDTH = 520;
const SETTINGS_TAB_TRIGGER_BASE_CLASSES =
  "ll:mt-0 ll:flex ll:min-h-8 ll:w-full ll:items-center ll:rounded-md ll:py-1.5 ll:text-gray-200 ll:font-semibold ll:transition-[background-color,border-color,color]";
const SETTINGS_TAB_TRIGGER_REGULAR_CLASSES =
  "ll:justify-start ll:gap-1.5 ll:border-transparent ll:px-2 ll:text-left ll:hover:border-gray-300/70 ll:hover:bg-gray-500/20 ll:data-[active]:border-purple-400/80 ll:data-[active]:bg-purple-500/20 ll:data-[active]:text-white";
const SETTINGS_TAB_TRIGGER_COMPACT_CLASSES =
  "ll:relative ll:justify-center ll:border-gray-500/40 ll:bg-black/5 ll:px-1.5 ll:text-gray-300 ll:hover:border-gray-300/70 ll:hover:bg-gray-500/18 ll:data-[active]:border-purple-300/80 ll:data-[active]:bg-purple-500/24 ll:data-[active]:text-white";

export const SettingsTabs = () => {
  const activeTab = useWindowsStore((state) => state.settings.state?.activeTab);
  const settingsWidth = useWindowsStore((state) => state.settings.size.width);
  const setSettingsActiveTab = useWindowsStore(
    (state) => state.setSettingsActiveTab,
  );
  const { t } = useTranslation();
  const baseTabsList: SettingsTabDefinition[] = [
    {
      value: "general",
      label: t("settings.tabs.general"),
      icon: Settings,
      content: <GeneralSettingsTab />,
    },
    {
      value: "timers",
      label: t("settings.tabs.timers"),
      icon: Clock,
      content: <TimersSettingsTab />,
    },
    {
      value: "catching",
      label: t("settings.tabs.catching"),
      icon: Target,
      content: <CatchingSettings />,
    },
    {
      value: "hidden-timers",
      label: t("settings.tabs.hiddenTimers"),
      icon: EyeOff,
      content: <HiddenTimersTab />,
    },
    {
      value: "npc-detector",
      label: t("settings.tabs.detector"),
      icon: Crosshair,
      content: <DetectorSettingsTab />,
    },
    {
      value: "notifications",
      label: t("settings.tabs.notifications"),
      icon: Bell,
      content: <NotificationsSettingsTab />,
    },
    {
      value: "notification-mutes",
      label: t("settings.tabs.notificationMutes"),
      icon: BellOff,
      content: <NotificationMutesSettingsTab />,
    },
    {
      value: "sounds",
      label: t("settings.tabs.sounds"),
      icon: Volume2,
      content: <SoundsSettingsTab />,
    },
    {
      value: "battle-panel",
      label: t("settings.tabs.battlePanel"),
      icon: Swords,
      content: <BattlePanelSettingsTab />,
    },
    {
      value: "hotkeys",
      label: t("settings.tabs.hotkeys"),
      icon: Keyboard,
      content: <HotkeysSettingsTab />,
    },
  ];
  const logsTab: SettingsTabDefinition = {
    value: "logs",
    label: t("settings.tabs.logs"),
    icon: FileText,
    content: <LogsSettingsTab />,
  };
  const informationTab: SettingsTabDefinition = {
    value: "information",
    label: t("settings.tabs.information"),
    icon: Info,
    content: <InformationSettingsTab />,
  };
  const debugTab: SettingsTabDefinition = {
    value: "debug",
    label: t("settings.tabs.debug"),
    icon: Bug,
    content: <DebugTab />,
  };
  const tabsList: SettingsTabDefinition[] = import.meta.env.DEV
    ? [...baseTabsList, logsTab, informationTab, debugTab]
    : [...baseTabsList, logsTab, informationTab];
  const selectedTab = tabsList.some((tab) => tab.value === activeTab)
    ? activeTab
    : "general";
  const isCompactSidebar = settingsWidth < SETTINGS_TABS_COMPACT_WIDTH;

  return (
    <div className="ll:h-full ll:box-border ll:flex ll:flex-col ll:pt-2 ll:min-h-0">
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          setSettingsActiveTab(value as SettingsTabValue)
        }
        className="ll:flex ll:h-full ll:w-full ll:min-h-0 ll:flex-row ll:gap-0"
      >
        <div
          className={`ll:relative ll:flex ll:h-full ll:min-h-0 ll:flex-col ll:bg-black/10 ${
            isCompactSidebar
              ? "ll:w-12 ll:min-w-12 ll:px-1"
              : "ll:w-40 ll:min-w-40 ll:px-1 ll:pr-1.5"
          }`}
        >
          <div className="ll:pointer-events-none ll:absolute ll:inset-y-0 ll:right-0 ll:w-px ll:bg-gray-400/30" />
          <ScrollArea className="ll:h-full ll:w-full ll:min-h-0 ll:flex-1 ll:box-border">
            <TabsList className="ll:flex ll:w-full ll:flex-col ll:items-stretch ll:justify-start ll:gap-1 ll:rounded-none ll:pt-0.5">
              {tabsList.map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedTab === tab.value;
                const trigger = (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    aria-label={tab.label}
                    className={`${SETTINGS_TAB_TRIGGER_BASE_CLASSES} ${
                      isCompactSidebar
                        ? SETTINGS_TAB_TRIGGER_COMPACT_CLASSES
                        : SETTINGS_TAB_TRIGGER_REGULAR_CLASSES
                    }`}
                  >
                    {isCompactSidebar && isActive ? (
                      <span className="ll:pointer-events-none ll:absolute ll:left-1 ll:top-1/2 ll:h-4 ll:w-0.5 ll:-translate-y-1/2 ll:rounded-full ll:bg-purple-300" />
                    ) : null}
                    <span
                      className={`ll:flex ll:size-4.5 ll:shrink-0 ll:items-center ll:justify-center ${
                        isActive ? "ll:text-white" : "ll:text-gray-300"
                      }`}
                    >
                      <Icon className={ICON_CLASSES} />
                    </span>
                    {!isCompactSidebar ? (
                      <span className="ll:min-w-0 ll:flex-1 ll:whitespace-normal ll:leading-[1.1rem]">
                        {tab.label}
                      </span>
                    ) : null}
                  </TabsTrigger>
                );

                if (!isCompactSidebar) {
                  return trigger;
                }

                return (
                  <Tooltip key={tab.value}>
                    <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                    <TooltipContent side="right">{tab.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </TabsList>
          </ScrollArea>
        </div>
        <div className="ll:flex ll:min-w-0 ll:flex-1 ll:min-h-0 ll:flex-col ll:pl-2">
          <ScrollArea className="ll:h-full ll:w-full ll:box-border ll:pr-2">
            {tabsList.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="ll:px-1 ll:pb-2"
              >
                {tab.content}
              </TabsContent>
            ))}
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
};
