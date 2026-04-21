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
import { NpcType } from "@/api/npcs.api";
import type { NotificationType } from "@lootlog/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const SYNC_INDICATOR_DELAY_MS = 100;

export const NotificationsSettingsTab = () => {
  const syncStatus = useGameAccountPreferencesSyncStatus();
  const [visibleStatus, setVisibleStatus] = useState(syncStatus.status);
  const { t } = useTranslation(["settings", "common"]);
  const categoryTabs: { label: string; key: NotificationType }[] = [
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
      title={t("notifications.title")}
      description={t("notifications.description")}
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
                  errorLabel={t("common:syncStatus.error")}
                  savingLabel={t("common:syncStatus.saving")}
                  syncingLabel={t("common:syncStatus.syncing")}
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
