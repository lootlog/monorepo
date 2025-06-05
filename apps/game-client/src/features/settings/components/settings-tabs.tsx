import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatchingSettings } from "@/features/settings/components/catching-settings";
import { FC } from "react";

export type SettingsTabsProps = {};

export const SettingsTabs: FC<SettingsTabsProps> = () => {
  return (
    <div className="ll-pt-2 ll-min-h-72">
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Ogólne</TabsTrigger>
          <TabsTrigger value="catching">Łapanie</TabsTrigger>
        </TabsList>
        <TabsContent value="general">Ogólne ustawienia dodatku</TabsContent>
        <TabsContent value="catching">
          <CatchingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
