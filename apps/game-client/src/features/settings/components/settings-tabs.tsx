import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BattlePanelSettingsTab } from "@/features/settings/components/battle-panel/battle-panel-settings-tab";
import { CatchingSettings } from "@/features/settings/components/catching/catching-settings";
import { DebugTab } from "@/features/settings/components/debug/debug-tab";
import { DetectorSettingsTab } from "@/features/settings/components/detector/detector-settings-tab";
import { GeneralSettingsTab } from "@/features/settings/components/general/general-settings-tab";
import { HiddenTimersTab } from "@/features/settings/components/hidden-timers/hidden-timers-tab";
import { NotificationsSettingsTab } from "@/features/settings/components/notifications/notifications-settings-tab";
import { TimersSettingsTab } from "@/features/settings/components/timers/timers-settings-tab";
import { FC } from "react";
import { ChatSettingsTab } from "./chat/chat-settings-tab";

export type SettingsTabsProps = {};

const TABS_LIST = [
  {
    value: "general",
    label: "Ogólne",
    content: <GeneralSettingsTab />,
  },
  {
    value: "timers",
    label: "Timery",
    content: <TimersSettingsTab />,
  },
  {
    value: "catching",
    label: "Dodawanie łupów i timerów",
    content: <CatchingSettings />,
  },
  {
    value: "hidden-timers",
    label: "Ukryte timery",
    content: <HiddenTimersTab />,
  },
  {
    value: "npc-detector",
    label: "Wykrywacz",
    content: <DetectorSettingsTab />,
  },
  {
    value: "notifications",
    label: "Powiadomienia",
    content: <NotificationsSettingsTab />,
  },
  {
    value: "battle-panel",
    label: "Panel walk (beta)",
    content: <BattlePanelSettingsTab />,
  },
  {
    value: "chat",
    label: "Chat",
    content: <ChatSettingsTab />,
  },
  {
    value: "debug",
    label: "Debug",
    content: <DebugTab />,
  },
];

export const SettingsTabs: FC<SettingsTabsProps> = () => {
  return (
    <div className="ll:h-full ll:flex ll:flex-col ll:pt-2">
      <Tabs
        defaultValue="general"
        className="ll:flex ll:flex-col ll:h-full ll:w-full"
      >
        <TabsList className="ll:flex-shrink-0 ll:flex-wrap ll:!justify-start ll:justify-items-start ll:gap-1 ll:gap-y-0 ll:flex ll:px-2">
          {TABS_LIST.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
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
