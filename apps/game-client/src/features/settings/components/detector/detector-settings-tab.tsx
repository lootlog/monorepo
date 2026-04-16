import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSyncStatus } from "@/components/settings/settings-sync-status";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  SETTINGS_SUBTABS_LIST_CLASS_NAME,
  SETTINGS_SUBTAB_CONTENT_CLASS_NAME,
  SETTINGS_SUBTAB_TRIGGER_CLASS_NAME,
} from "@/components/settings/settings-styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetectorRoutingSettingsTabForm } from "@/features/settings/components/detector/detector-routing-settings-tab-form";
import { DetectorSettingsTabForm } from "@/features/settings/components/detector/detector-settings-tab-form";
import { NpcType } from "@/hooks/api/use-npcs";
import { useNotificationSettingsSyncStatus } from "@/hooks/use-notification-settings-sync-status";
import type { DetectorNpcType } from "@lootlog/types";
import { useEffect, useState, type ReactNode } from "react";

const CATEGORY_TABS: Array<{
  label: string;
  key: DetectorNpcType;
  content: ReactNode;
}> = [
  {
    label: "Elita 2",
    key: NpcType.ELITE2,
    content: <DetectorSettingsTabForm categoryKey={NpcType.ELITE2} />,
  },
  {
    label: "Heros",
    key: NpcType.HERO,
    content: <DetectorSettingsTabForm categoryKey={NpcType.HERO} />,
  },
  {
    label: "Kolos",
    key: NpcType.COLOSSUS,
    content: <DetectorSettingsTabForm categoryKey={NpcType.COLOSSUS} />,
  },
  {
    label: "Tytan",
    key: NpcType.TITAN,
    content: <DetectorSettingsTabForm categoryKey={NpcType.TITAN} />,
  },
];

const SYNC_INDICATOR_DELAY_MS = 100;

export const DetectorSettingsTab = () => {
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
      title="Ustawienia wykrywacza"
      description="Skonfiguruj wspólny routing komunikatów oraz lokalne wykrywanie NPC dla każdego typu."
      contentClassName="ll:gap-3"
    >
      <div className="ll:relative">
        <div className="ll:sticky ll:top-0 ll:z-10 ll:flex ll:h-0 ll:justify-end ll:pointer-events-none">
          <SettingsSyncStatus
            status={visibleStatus}
            errorLabel="Blad synchronizacji"
            savingLabel="Zapisywanie..."
            syncingLabel="Synchronizowanie..."
          />
        </div>
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
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>

        <SettingsSection title="Routing">
          <DetectorRoutingSettingsTabForm />
        </SettingsSection>
      </div>
    </SettingsTabLayout>
  );
};
