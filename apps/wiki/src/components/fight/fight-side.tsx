import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lootlog/ui/components/tabs";
import { EquipmentSetLayout } from "@/components/equipment/equipment-set-layout";
import { EquipmentSetStats } from "@/components/equipment/equipment-set-stats";
import { SetSkillTree } from "@/components/skills/set-skill-tree";
import { t } from "@/i18n/messages";

export function FightSide() {
  return (
    <EquipmentSetLayout>
      <Tabs defaultValue="skills" className="gap-5">
        <TabsList variant="underline" aria-label={t("setPage.sections")}>
          <TabsTrigger value="skills">{t("setPage.skillsTab")}</TabsTrigger>
          <TabsTrigger value="stats">{t("setPage.statsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="skills">
          <SetSkillTree />
        </TabsContent>
        <TabsContent value="stats">
          <EquipmentSetStats />
        </TabsContent>
      </Tabs>
    </EquipmentSetLayout>
  );
}
