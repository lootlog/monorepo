import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  NotificationCategoryTabs,
  type NotificationCategoryTab,
} from "@/features/settings/components/notifications/notification-category-tabs";
import { useTranslation } from "react-i18next";

export const ChatNotificationsSettingsTab = () => {
  const { t } = useTranslation(["settings", "common"]);
  const categories: NotificationCategoryTab[] = [
    { label: t("common:npcTypes.message"), key: "message" },
    { label: t("common:npcTypes.partyGathering"), key: "party-gathering" },
  ];

  return (
    <SettingsTabLayout
      title={t("chatNotifications.title")}
      description={t("chatNotifications.description")}
      contentClassName="ll:gap-3"
    >
      <div
        id="chat-notification-rules"
        data-settings-control="chat-notification-rules"
      >
        <NotificationCategoryTabs categories={categories} />
      </div>
    </SettingsTabLayout>
  );
};
