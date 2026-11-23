import { createFileRoute } from "@tanstack/react-router";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { EquipmentSetActions } from "@/components/equipment/equipment-set-actions";
import { EquipmentSetPanel } from "@/components/equipment/equipment-set-panel";
import { EquipmentSetStats } from "@/components/equipment/equipment-set-stats";
import { SetUpgradeCost } from "@/components/equipment/set-upgrade-cost";
import { SetSocketComponents } from "@/components/equipment/set-socket-components";
import { SetSkillTree } from "@/components/skills/set-skill-tree";
import { t } from "@/i18n/messages";
import { Card } from "@lootlog/ui/components/card";

export const Route = createFileRoute("/set")({
  component: SetRoute,
  head: () => ({
    meta: [{ title: `${t("equipment.title")} | ${t("meta.title")}` }],
  }),
});

function SetRoute() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <PortalPageHeader
        title={t("equipment.title")}
        description={t("setPage.description")}
        actions={<EquipmentSetActions />}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-[4.5rem]">
          <Card className="gap-0 p-4">
            <EquipmentSetPanel />
          </Card>
        </aside>
        <Tabs defaultValue="stats" className="min-w-0 gap-5">
          <TabsList variant="underline" aria-label={t("setPage.sections")}>
            <TabsTrigger value="stats">{t("setPage.statsTab")}</TabsTrigger>
            <TabsTrigger value="skills">{t("setPage.skillsTab")}</TabsTrigger>
            <TabsTrigger value="cost">
              {t("setPage.upgradeCostTab")}
            </TabsTrigger>
            <TabsTrigger value="sockets">{t("setPage.socketsTab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="stats">
            <EquipmentSetStats />
          </TabsContent>
          <TabsContent value="skills">
            <SetSkillTree />
          </TabsContent>
          <TabsContent value="cost">
            <SetUpgradeCost />
          </TabsContent>
          <TabsContent value="sockets">
            <SetSocketComponents />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
