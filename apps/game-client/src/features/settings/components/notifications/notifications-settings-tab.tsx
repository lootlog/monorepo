import { SettingsSyncStatus } from "@/components/settings/settings-sync-status";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  SETTINGS_SUBTABS_LIST_CLASS_NAME,
  SETTINGS_SUBTAB_CONTENT_CLASS_NAME,
  SETTINGS_SUBTAB_TRIGGER_CLASS_NAME,
} from "@/components/settings/settings-styles";
import { useNotificationSettingsSyncStatus } from "@/hooks/use-notification-settings-sync-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCategoryForm } from "@/features/settings/components/notifications/notification-category-form";
import { NpcType } from "@/hooks/api/use-npcs";
import type { NotificationType } from "@lootlog/types";
import { useEffect, useState } from "react";

const CATEGORY_TABS: { label: string; key: NotificationType }[] = [
  { label: "Elita 2", key: NpcType.ELITE2 },
  { label: "Heros", key: NpcType.HERO },
  { label: "Kolos", key: NpcType.COLOSSUS },
  { label: "Tytan", key: NpcType.TITAN },
  { label: "Komunikaty", key: "message" },
  { label: "Grupa", key: "party-gathering" },
];

const SYNC_INDICATOR_DELAY_MS = 100;

export const NotificationsSettingsTab = () => {
  const syncStatus = useNotificationSettingsSyncStatus();
  const [visibleStatus, setVisibleStatus] = useState(syncStatus.status);

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
      title="Ustawienia powiadomień"
      description="Skonfiguruj ustawienia powiadomień. Możesz dostosować, które typy NPC będą wywoływać powiadomienia oraz jak będą one prezentowane."
      contentClassName="ll:gap-3"
    >
      <Tabs defaultValue={NpcType.ELITE2} className="ll:w-full ll:gap-3">
        <TabsList className={SETTINGS_SUBTABS_LIST_CLASS_NAME}>
          {CATEGORY_TABS.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={SETTINGS_SUBTAB_TRIGGER_CLASS_NAME}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORY_TABS.map((tab) => (
          <TabsContent
            key={tab.key}
            value={tab.key}
            className={SETTINGS_SUBTAB_CONTENT_CLASS_NAME}
          >
            <div className="ll:relative">
              <div className="ll:sticky ll:top-0 ll:z-10 ll:flex ll:h-0 ll:justify-end ll:pointer-events-none">
                <SettingsSyncStatus
                  status={visibleStatus}
                  errorLabel="Błąd synchronizacji"
                  savingLabel="Zapisywanie..."
                  syncingLabel="Synchronizowanie..."
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
