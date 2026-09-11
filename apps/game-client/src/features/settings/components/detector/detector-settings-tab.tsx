import { NpcTypeChip } from "@/components/settings/npc-type-chip";
import {
  SettingsCategoryAccordion,
  SettingsCategoryAccordionItem,
} from "@/components/settings/settings-category-accordion";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { DetectorSettingsTabForm } from "@/features/settings/components/detector/detector-settings-tab-form";
import { NpcType } from "@/api/npcs.api";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import type { DetectorNpcType } from "@lootlog/schema/account-preferences";
import { useTranslation } from "react-i18next";

export const DetectorSettingsTab = () => {
  const { t } = useTranslation();
  const { settings } = useCurrentGameAccountDetectorSettings();

  const categories: Array<{ label: string; key: DetectorNpcType }> = [
    { label: t("common:npcTypes.elite2"), key: NpcType.ELITE2 },
    { label: t("common:npcTypes.hero"), key: NpcType.HERO },
    { label: t("common:npcTypes.colossus"), key: NpcType.COLOSSUS },
    { label: t("common:npcTypes.titan"), key: NpcType.TITAN },
  ];

  const firstCategory = categories[0];

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="detector-types"
        title={t("settings.detector.typesTitle")}
      >
        <SettingsCategoryAccordion
          defaultOpen={firstCategory ? [firstCategory.key] : []}
        >
          {categories.map((category) => {
            const categorySettings = settings[category.key];

            const summary = categorySettings.detect
              ? [
                  t("settings.detector.summaryEnabled"),
                  categorySettings.autoSend
                    ? t("settings.detector.summaryAutoSend")
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : t("settings.detector.summaryDisabled");

            return (
              <SettingsCategoryAccordionItem
                key={category.key}
                id={category.key}
                title={
                  <NpcTypeChip npcType={category.key}>
                    {category.label}
                  </NpcTypeChip>
                }
                summary={summary}
                triggerLabel={category.label}
              >
                <DetectorSettingsTabForm categoryKey={category.key} />
              </SettingsCategoryAccordionItem>
            );
          })}
        </SettingsCategoryAccordion>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
