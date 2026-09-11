import { NpcTypeChip } from "@/components/settings/npc-type-chip";
import {
  SettingsCategoryAccordion,
  SettingsCategoryAccordionItem,
} from "@/components/settings/settings-category-accordion";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { NotificationCategoryForm } from "@/features/settings/components/notifications/notification-category-form";
import { NpcType } from "@/api/npcs.api";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";
import type { NotificationType } from "@lootlog/schema/account-preferences";
import { useTranslation } from "react-i18next";

type NotificationCategory = {
  label: string;
  key: NotificationType;
  npcType?: string;
};

export const NotificationsSettingsTab = () => {
  const { t } = useTranslation();
  const { settings } = useCurrentGameAccountNotificationSettings();

  const categories: NotificationCategory[] = [
    {
      label: t("common:npcTypes.elite2"),
      key: NpcType.ELITE2,
      npcType: NpcType.ELITE2,
    },
    {
      label: t("common:npcTypes.hero"),
      key: NpcType.HERO,
      npcType: NpcType.HERO,
    },
    {
      label: t("common:npcTypes.colossus"),
      key: NpcType.COLOSSUS,
      npcType: NpcType.COLOSSUS,
    },
    {
      label: t("common:npcTypes.titan"),
      key: NpcType.TITAN,
      npcType: NpcType.TITAN,
    },
    { label: t("common:npcTypes.message"), key: "message" },
    { label: t("common:npcTypes.partyGathering"), key: "party-gathering" },
  ];

  const firstCategory = categories[0];

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="notification-rules"
        title={t("settings.notifications.rulesTitle")}
        description={t("settings.notifications.description")}
      >
        <SettingsCategoryAccordion
          defaultOpen={firstCategory ? [firstCategory.key] : []}
        >
          {categories.map((category) => {
            const categorySettings = settings[category.key];

            const summary = categorySettings.show
              ? t("settings.notifications.summaryEnabled", {
                  count: categorySettings.guildIds.length,
                })
              : t("settings.notifications.summaryDisabled");

            return (
              <SettingsCategoryAccordionItem
                key={category.key}
                id={category.key}
                title={
                  category.npcType ? (
                    <NpcTypeChip npcType={category.npcType}>
                      {category.label}
                    </NpcTypeChip>
                  ) : (
                    category.label
                  )
                }
                summary={summary}
                triggerLabel={category.label}
              >
                <NotificationCategoryForm categoryKey={category.key} />
              </SettingsCategoryAccordionItem>
            );
          })}
        </SettingsCategoryAccordion>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
