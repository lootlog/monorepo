import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export const GeneralSettingsTab: FC = () => {
  const { allowWorldSelection, toggleAllowWorldSelection } = useSettingsStore();
  const { t } = useTranslation();

  return (
    <SettingsTabLayout
      title={t("settings.general.title")}
      description={t("settings.general.description")}
    >
      <SettingsSection title={t("settings.general.behaviorTitle")}>
        <SettingsControlRow
          label={t("settings.general.allowWorldSelectionLabel")}
          description={t("settings.general.allowWorldSelectionDescription")}
        >
          <Switch
            checked={allowWorldSelection}
            onCheckedChange={toggleAllowWorldSelection}
            id="allow-world-selection"
          />
        </SettingsControlRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
