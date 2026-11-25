import { createFileRoute } from "@tanstack/react-router";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { EquipmentSetActions } from "@/components/equipment/equipment-set-actions";
import { EquipmentSetLayout } from "@/components/equipment/equipment-set-layout";
import { EquipmentSetStats } from "@/components/equipment/equipment-set-stats";
import { SetUpgradeCost } from "@/components/equipment/set-upgrade-cost";
import { SetSocketComponents } from "@/components/equipment/set-socket-components";
import { SetSkills } from "@/components/skills/set-skills";
import { t } from "@/i18n/messages";
import { wikiPageHead } from "@/lib/link-preview";

export const Route = createFileRoute("/set")({
  component: SetRoute,
  head: () =>
    wikiPageHead({
      path: "/set",
      title: t("equipment.title"),
      description: t("setPage.description"),
      noindex: true,
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
      <EquipmentSetLayout>
        <Tabs defaultValue="stats" className="gap-5">
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
            <SetSkills />
          </TabsContent>
          <TabsContent value="cost">
            <SetUpgradeCost />
          </TabsContent>
          <TabsContent value="sockets">
            <SetSocketComponents />
          </TabsContent>
        </Tabs>
      </EquipmentSetLayout>
    </div>
  );
}
