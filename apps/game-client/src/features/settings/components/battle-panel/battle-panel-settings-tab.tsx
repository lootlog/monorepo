import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { recordRecentlyChanged } from "@/features/settings/recently-changed.store";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const BattlePanelSettingsTab: FC = () => {
  const { isBattleCollectionEnabled, toggleBattleCollection } =
    useBattlePanelStore();

  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("settings.battlePanel.dataCollectionTitle")}>
        <SettingsRow
          controlId="battle-data-collection"
          label={t("settings.battlePanel.enableCollectionLabel")}
          description={t("settings.battlePanel.enableCollectionDescription")}
        >
          <Switch
            checked={isBattleCollectionEnabled}
            onCheckedChange={() => {
              recordRecentlyChanged("battle-data-collection");
              toggleBattleCollection();
            }}
            id="battle-collection-enabled"
          />
        </SettingsRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
