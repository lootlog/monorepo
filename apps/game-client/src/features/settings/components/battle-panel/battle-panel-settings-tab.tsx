import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const BattlePanelSettingsTab: FC = () => {
  const { isBattleCollectionEnabled, toggleBattleCollection } =
    useBattlePanelStore();
  const { t } = useTranslation();

  return (
    <SettingsTabLayout
      title={t("settings.battlePanel.title")}
      description={t("settings.battlePanel.description")}
    >
      <SettingsSection title={t("settings.battlePanel.dataCollectionTitle")}>
        <SettingsControlRow
          label={t("settings.battlePanel.enableCollectionLabel")}
          description={t("settings.battlePanel.enableCollectionDescription")}
        >
          <Switch
            checked={isBattleCollectionEnabled}
            onCheckedChange={toggleBattleCollection}
            id="battle-collection-enabled"
          />
        </SettingsControlRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
