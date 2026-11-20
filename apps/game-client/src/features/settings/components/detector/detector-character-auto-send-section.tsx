import { SettingsRow } from "@/features/settings/components/shared/settings-row";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { Switch } from "@/components/ui/switch";
import { useSettingField } from "@/lib/settings-persistence/use-setting-field";
import { useTranslation } from "react-i18next";

export const DetectorCharacterAutoSendSection = () => {
  const { t } = useTranslation();

  const { value, setValue } = useSettingField(
    "gameData.detectorAutoSendEnabled",
  );

  return (
    <SettingsSection title={t("settings.detector.characterTitle")}>
      <SettingsRow
        controlId="detector-character-auto-send"
        htmlFor="detector-character-auto-send"
        label={t("settings.detector.characterAutoSend.label")}
        description={t("settings.detector.characterAutoSend.description")}
      >
        <Switch
          id="detector-character-auto-send"
          checked={value}
          onCheckedChange={(checked) => setValue(checked)}
        />
      </SettingsRow>
    </SettingsSection>
  );
};
