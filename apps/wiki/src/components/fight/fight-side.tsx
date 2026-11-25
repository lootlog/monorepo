import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { EquipmentSetLayout } from "@/components/equipment/equipment-set-layout";
import { EquipmentSetStats } from "@/components/equipment/equipment-set-stats";
import { SetSkills } from "@/components/skills/set-skills";
import { t } from "@/i18n/messages";

export function FightSide() {
  return (
    <EquipmentSetLayout>
      <Tabs defaultValue="skills" className="gap-5 [--set-sticky-top:7.25rem]">
        <TabsList variant="underline" aria-label={t("setPage.sections")}>
          <TabsTrigger value="skills">{t("setPage.skillsTab")}</TabsTrigger>
          <TabsTrigger value="stats">{t("setPage.statsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="skills">
          <SetSkills />
        </TabsContent>
        <TabsContent value="stats">
          <EquipmentSetStats />
        </TabsContent>
      </Tabs>
    </EquipmentSetLayout>
  );
}
