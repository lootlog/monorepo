import { SettingsSyncStatus } from "@/components/settings/settings-sync-status";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  SETTINGS_SUBTABS_LIST_CLASS_NAME,
  SETTINGS_SUBTAB_CONTENT_CLASS_NAME,
  SETTINGS_SUBTAB_TRIGGER_CLASS_NAME,
} from "@/components/settings/settings-styles";
import { useGameAccountPreferencesSyncStatus } from "@/hooks/use-game-account-preferences-sync-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCategoryForm } from "@/features/settings/components/notifications/notification-category-form";
import { NpcType } from "@/hooks/api/use-npcs";
import type { NotificationType } from "@lootlog/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const SYNC_INDICATOR_DELAY_MS = 100;

export const NotificationsSettingsTab = () => {
  const syncStatus = useGameAccountPreferencesSyncStatus();
  const [visibleStatus, setVisibleStatus] = useState(syncStatus.status);
  const { t } = useTranslation();
  const categoryTabs: { label: string; key: NotificationType }[] = [
    { label: t("settings.npcTypes.elite2"), key: NpcType.ELITE2 },
    { label: t("settings.npcTypes.hero"), key: NpcType.HERO },
    { label: t("settings.npcTypes.colossus"), key: NpcType.COLOSSUS },
    { label: t("settings.npcTypes.titan"), key: NpcType.TITAN },
    { label: t("settings.npcTypes.message"), key: "message" },
    {
      label: t("settings.npcTypes.partyGathering"),
      key: "party-gathering",
    },
  ];

  useEffect(() => {
    if (syncStatus.status === "error" || syncStatus.status === "idle") {
      setVisibleStatus(syncStatus.status);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleStatus(syncStatus.status);
    }, SYNC_INDICATOR_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [syncStatus.status]);

  return (
    <SettingsTabLayout
      title={t("settings.notifications.title")}
      description={t("settings.notifications.description")}
      contentClassName="ll:gap-3"
    >
      <Tabs defaultValue={NpcType.ELITE2} className="ll:w-full ll:gap-3">
        <TabsList className={SETTINGS_SUBTABS_LIST_CLASS_NAME}>
          {categoryTabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {categoryTabs.map((tab) => (
          <TabsContent
            key={tab.key}
            value={tab.key}
            className={SETTINGS_SUBTAB_CONTENT_CLASS_NAME}
          >
            <div className="ll:relative">
              <div className="ll:sticky ll:top-0 ll:z-10 ll:flex ll:h-0 ll:justify-end ll:pointer-events-none">
                <SettingsSyncStatus
                  status={visibleStatus}
                  errorLabel={t("settings.common.syncStatus.error")}
                  savingLabel={t("settings.common.syncStatus.saving")}
                  syncingLabel={t("settings.common.syncStatus.syncing")}
                />
              </div>
              <NotificationCategoryForm categoryKey={tab.key} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </SettingsTabLayout>
  );
};
