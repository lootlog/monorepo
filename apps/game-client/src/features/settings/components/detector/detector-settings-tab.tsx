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
import { NpcType } from "@/api/npcs.api";
import { useGameAccountPreferencesSyncIndicator } from "@/hooks/use-game-account-preferences-sync-status";
import type { DetectorNpcType } from "@lootlog/schema/account-preferences";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export const DetectorSettingsTab = () => {
  const resolvedVisibleStatus = useGameAccountPreferencesSyncIndicator();
  const { t } = useTranslation(["settings", "common"]);
  const categoryTabs: Array<{
    label: string;
    key: DetectorNpcType;
    content: ReactNode;
  }> = [
    {
      label: t("common:npcTypes.elite2"),
      key: NpcType.ELITE2,
      content: <DetectorSettingsTabForm categoryKey={NpcType.ELITE2} />,
    },
    {
      label: t("common:npcTypes.hero"),
      key: NpcType.HERO,
      content: <DetectorSettingsTabForm categoryKey={NpcType.HERO} />,
    },
    {
      label: t("common:npcTypes.colossus"),
      key: NpcType.COLOSSUS,
      content: <DetectorSettingsTabForm categoryKey={NpcType.COLOSSUS} />,
    },
    {
      label: t("common:npcTypes.titan"),
      key: NpcType.TITAN,
      content: <DetectorSettingsTabForm categoryKey={NpcType.TITAN} />,
    },
  ];

  return (
    <SettingsTabLayout
      title={t("detector.title")}
      description={t("detector.description")}
      contentClassName="ll:gap-3"
    >
      <div className="ll:relative">
        <div className="ll:sticky ll:top-0 ll:z-10 ll:flex ll:h-0 ll:justify-end ll:pointer-events-none">
          <SettingsSyncStatus
            status={resolvedVisibleStatus}
            errorLabel={t("common:syncStatus.error")}
            savingLabel={t("common:syncStatus.saving")}
            syncingLabel={t("common:syncStatus.syncing")}
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
