import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettings } from "@/screens/settings/components/general-settings/general-settings";
import { LootlogSettings } from "@/screens/settings/components/lootlog-settings/lootlog-settings";
import { RolesSettings } from "@/screens/settings/components/roles-settings/roles-settings";

enum TabKey {
  GENERAL = "general",
  ROLES = "roles",
  LOOTLOG = "lootlog",
}

const TABS_LIST = [
  {
    value: TabKey.GENERAL,
    trigger: (
      <TabsTrigger value={TabKey.GENERAL} key={TabKey.GENERAL}>
        Ogólne
      </TabsTrigger>
    ),
    content: (
      <TabsContent value={TabKey.GENERAL} key={TabKey.GENERAL}>
        <GeneralSettings />
      </TabsContent>
    ),
  },
  {
    value: TabKey.ROLES,
    trigger: (
      <TabsTrigger value={TabKey.ROLES} key={TabKey.ROLES}>
        Role
      </TabsTrigger>
    ),
    content: (
      <TabsContent value={TabKey.ROLES} key={TabKey.ROLES}>
        <RolesSettings />
      </TabsContent>
    ),
  },
  {
    value: TabKey.LOOTLOG,
    trigger: (
      <TabsTrigger value={TabKey.LOOTLOG} key={TabKey.LOOTLOG}>
        Lootlog
      </TabsTrigger>
    ),
    content: (
      <TabsContent value={TabKey.LOOTLOG} key={TabKey.LOOTLOG}>
        <LootlogSettings />
      </TabsContent>
    ),
  },
];

export const Settings: React.FC = () => {
  return (
    <div className="flex flex-row w-full h-[calc(100%)]">
      <div className="w-full h-full">
        <PageHeader>
          <div className="flex flex-row gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold p-0">Ustawienia</h1>
          </div>
        </PageHeader>
        <Tabs defaultValue={TabKey.GENERAL} className="w-full">
          <div className="border-b p-2">
            <TabsList className="gap-4 bg-transparent">
              {TABS_LIST.map((tab) => {
                return tab.trigger;
              })}
            </TabsList>
          </div>
          <ScrollArea className="flex w-full h-[calc(100dvh-128px)]">
            {TABS_LIST.map((tab) => {
              return tab.content;
            })}
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};
