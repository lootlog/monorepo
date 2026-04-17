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
import { useGameAccountPreferencesSyncStatus } from "@/hooks/use-game-account-preferences-sync-status";
import type { DetectorNpcType } from "@lootlog/types";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const SYNC_INDICATOR_DELAY_MS = 100;

export const DetectorSettingsTab = () => {
  const syncStatus = useGameAccountPreferencesSyncStatus();
  const [visibleStatus, setVisibleStatus] = useState(syncStatus.status);
  const { t } = useTranslation();
  const categoryTabs: Array<{
    label: string;
    key: DetectorNpcType;
    content: ReactNode;
  }> = [
    {
      label: t("settings.npcTypes.elite2"),
      key: NpcType.ELITE2,
      content: <DetectorSettingsTabForm categoryKey={NpcType.ELITE2} />,
    },
    {
      label: t("settings.npcTypes.hero"),
      key: NpcType.HERO,
      content: <DetectorSettingsTabForm categoryKey={NpcType.HERO} />,
    },
    {
      label: t("settings.npcTypes.colossus"),
      key: NpcType.COLOSSUS,
      content: <DetectorSettingsTabForm categoryKey={NpcType.COLOSSUS} />,
    },
    {
      label: t("settings.npcTypes.titan"),
      key: NpcType.TITAN,
      content: <DetectorSettingsTabForm categoryKey={NpcType.TITAN} />,
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
      title={t("settings.detector.title")}
      description={t("settings.detector.description")}
      contentClassName="ll:gap-3"
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
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>

        <SettingsSection>
          <DetectorRoutingSettingsTabForm />
        </SettingsSection>
      </div>
    </SettingsTabLayout>
  );
};
