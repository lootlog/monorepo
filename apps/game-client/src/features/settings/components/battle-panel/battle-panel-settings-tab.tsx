import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import type { FC } from "react";

export const BattlePanelSettingsTab: FC = () => {
  const { isBattleCollectionEnabled, toggleBattleCollection } =
    useBattlePanelStore();

  return (
    <SettingsTabLayout
      title="Ustawienia panelu walk"
      description="Skonfiguruj ustawienia dotyczące zbierania danych walk w grze."
    >
      <SettingsSection title="Zbieranie danych">
        <SettingsControlRow
          label="Włącz zbieranie walk"
          description="Rejestruje dane walk używane przez panel."
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
