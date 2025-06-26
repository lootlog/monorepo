import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatchingSettings } from "@/features/settings/components/catching/catching-settings";
import { DetectorSettingsTab } from "@/features/settings/components/detector/detector-settings-tab";
import { GeneralSettingsTab } from "@/features/settings/components/general/general-settings-tab";
import { HiddenTimersTab } from "@/features/settings/components/hidden-timers/hidden-timers-tab";
import { FC } from "react";

export type SettingsTabsProps = {};

const TABS_LIST = [
  {
    value: "general",
    label: "Ogólne",
    content: <GeneralSettingsTab />,
  },
  {
    value: "catching",
    label: "Zbieranie lootu i timerów",
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
];

export const SettingsTabs: FC<SettingsTabsProps> = () => {
  return (
    <div className="ll-h-full ll-flex ll-flex-col ll-pt-2 ll-px-2">
      <Tabs
        defaultValue="general"
        className="ll-flex ll-flex-col ll-h-full ll-w-full"
      >
        <TabsList
          className="ll-flex-shrink-0" /* wymuś brak rozciągania w pionie */
        >
          {TABS_LIST.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollArea className="ll-h-full ll-w-full ll-box-border" type="auto">
          {TABS_LIST.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
};
