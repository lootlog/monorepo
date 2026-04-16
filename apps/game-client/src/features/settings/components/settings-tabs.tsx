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
import { NotificationMutesSettingsTab } from "@/features/settings/components/notification-mutes/notification-mutes-settings-tab";
import { NotificationsSettingsTab } from "@/features/settings/components/notifications/notifications-settings-tab";
import { HotkeysSettingsTab } from "@/features/settings/components/hotkeys/hotkeys-settings-tab";
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
  Keyboard,
  Settings,
  Swords,
  Target,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { FC, ReactNode } from "react";

type SettingsTabsProps = {};

type SettingsTabDefinition = {
  value: SettingsTabValue;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
};

const BASE_TABS_LIST: SettingsTabDefinition[] = [
  {
    value: "general",
    label: "Ogólne",
    icon: Settings,
    content: <GeneralSettingsTab />,
  },
  {
    value: "timers",
    label: "Timery",
    icon: Clock,
    content: <TimersSettingsTab />,
  },
  {
    value: "catching",
    label: "Dodawanie łupów i timerów",
    icon: Target,
    content: <CatchingSettings />,
  },
  {
    value: "hidden-timers",
    label: "Ukryte timery",
    icon: EyeOff,
    content: <HiddenTimersTab />,
  },
  {
    value: "npc-detector",
    label: "Wykrywacz",
    icon: Crosshair,
    content: <DetectorSettingsTab />,
  },
  {
    value: "notifications",
    label: "Powiadomienia",
    icon: Bell,
    content: <NotificationsSettingsTab />,
  },
  {
    value: "notification-mutes",
    label: "Wyciszenia",
    icon: BellOff,
    content: <NotificationMutesSettingsTab />,
  },
  {
    value: "sounds",
    label: "Dźwięki",
    icon: Volume2,
    content: <SoundsSettingsTab />,
  },
  {
    value: "battle-panel",
    label: "Panel walk (beta)",
    icon: Swords,
    content: <BattlePanelSettingsTab />,
  },
  {
    value: "hotkeys",
    label: "Skróty klawiszowe",
    icon: Keyboard,
    content: <HotkeysSettingsTab />,
  },
];

const DEBUG_TAB: SettingsTabDefinition = {
  value: "debug",
  label: "Debug",
  icon: Bug,
  content: <DebugTab />,
};

const TABS_LIST: SettingsTabDefinition[] = import.meta.env.DEV
  ? [...BASE_TABS_LIST, DEBUG_TAB]
  : BASE_TABS_LIST;

const ICON_CLASSES = "ll:size-4 ll:stroke-2";

export const SettingsTabs: FC<SettingsTabsProps> = () => {
  const activeTab = useWindowsStore((state) => state.settings.state?.activeTab);
  const setSettingsActiveTab = useWindowsStore(
    (state) => state.setSettingsActiveTab,
  );
  const selectedTab = TABS_LIST.some((tab) => tab.value === activeTab)
    ? activeTab
    : "general";

  return (
    <div className="ll:h-full ll:flex ll:flex-col ll:pt-2">
      <Tabs
        value={selectedTab}
        onValueChange={(value) =>
          setSettingsActiveTab(value as SettingsTabValue)
        }
        className="ll:flex ll:flex-col ll:h-full ll:w-full"
      >
        <TabsList className="ll:shrink-0 ll:flex-wrap ll:justify-start! ll:justify-items-start ll:gap-1 ll:gap-y-0 ll:flex ll:px-2">
          {TABS_LIST.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ll:flex ll:items-center ll:justify-center ll:p-0.5">
                      <Icon className={ICON_CLASSES} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{tab.label}</TooltipContent>
                </Tooltip>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <ScrollArea className="ll:h-full ll:w-full ll:box-border" type="hover">
          {TABS_LIST.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="ll:px-2">
              {tab.content}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
};
