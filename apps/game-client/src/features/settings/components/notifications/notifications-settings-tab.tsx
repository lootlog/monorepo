import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  NotificationCategoryTabs,
  type NotificationCategoryTab,
} from "@/features/settings/components/notifications/notification-category-tabs";
import { NpcType } from "@/api/npcs.api";
import { useTranslation } from "react-i18next";

export const NotificationsSettingsTab = () => {
  const { t } = useTranslation(["settings", "common"]);

  const categories: NotificationCategoryTab[] = [
    { label: t("common:npcTypes.elite2"), key: NpcType.ELITE2 },
    { label: t("common:npcTypes.hero"), key: NpcType.HERO },
    { label: t("common:npcTypes.colossus"), key: NpcType.COLOSSUS },
    { label: t("common:npcTypes.titan"), key: NpcType.TITAN },
    { label: t("common:npcTypes.message"), key: "message" },
    {
      label: t("common:npcTypes.partyGathering"),
      key: "party-gathering",
    },
  ];

  return (
    <SettingsTabLayout contentClassName="ll:gap-3">
      <SettingsSection controlId="notification-rules">
        <NotificationCategoryTabs categories={categories} />
      </SettingsSection>
    </SettingsTabLayout>
  );
};
