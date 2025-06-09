import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatchingSettings } from "@/features/settings/components/catching-settings";
import { GeneralSettingsTab } from "@/features/settings/components/general-settings-tab";
import { HiddenTimersTab } from "@/features/settings/components/hidden-timers-tab";
import { FC } from "react";

export type SettingsTabsProps = {};

export const SettingsTabs: FC<SettingsTabsProps> = () => {
  return (
    <div className="ll-pt-2 ll-min-h-72">
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Ogólne</TabsTrigger>
          <TabsTrigger value="catching">Zbieranie lootu i timerów</TabsTrigger>
          <TabsTrigger value="hidden-timers">Ukryte timery</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettingsTab />
        </TabsContent>
        <TabsContent value="catching">
          <CatchingSettings />
        </TabsContent>
        <TabsContent value="hidden-timers">
          <HiddenTimersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
