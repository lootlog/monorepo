import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSliderField } from "@/components/settings/settings-slider-field";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const formatFontSize = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(1)}px`;

export const TimersSettingsAppearance: FC = () => {
  const { displayConfig, setDisplayConfig } = useTimersStore();
  const { t } = useTranslation();

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="timer-visibility"
        title={t("settings.timers.appearance.visibilityTitle")}
      >
        <SettingsRow
          htmlFor="show-level"
          label={t("settings.timers.appearance.showLevelLabel")}
          description={t("settings.timers.appearance.showLevelDescription")}
        >
          <Switch
            checked={displayConfig.showLevel}
            onCheckedChange={(checked) => {
              setDisplayConfig({ ...displayConfig, showLevel: checked });
            }}
            id="show-level"
          />
        </SettingsRow>
        <SettingsRow
          htmlFor="show-type"
          label={t("settings.timers.appearance.showTypeLabel")}
          description={t("settings.timers.appearance.showTypeDescription")}
        >
          <Switch
            checked={displayConfig.showType}
            onCheckedChange={(checked) => {
              setDisplayConfig({ ...displayConfig, showType: checked });
            }}
            id="show-type"
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection
        controlId="timer-layout"
        title={t("settings.timers.appearance.layoutTitle")}
      >
        <SettingsRow
          label={t("settings.timers.appearance.singleTimerDisplayModeLabel")}
          description={t(
            "settings.timers.appearance.singleTimerDisplayModeDescription",
          )}
        >
          <ToggleGroup
            className="ll:ml-auto"
            variant="outline"
            size="sm"
            spacing={0}
            onValueChange={([value]: ("column" | "row")[]) => {
              if (value) {
                setDisplayConfig({
                  ...displayConfig,
                  singleTimerDisplayMode: value,
                });
              }
            }}
            value={[displayConfig.singleTimerDisplayMode]}
          >
            <ToggleGroupItem value="column">
              {t("settings.timers.appearance.singleTimerDisplayModeColumn")}
            </ToggleGroupItem>
            <ToggleGroupItem value="row">
              {t("settings.timers.appearance.singleTimerDisplayModeRow")}
            </ToggleGroupItem>
          </ToggleGroup>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection
        controlId="timer-scale"
        title={t("settings.timers.appearance.scaleTitle")}
      >
        <SettingsRow
          label={t("settings.timers.appearance.fontSizeLabel")}
          description={t("settings.timers.appearance.fontSizeDescription")}
          control="wide"
        >
          <SettingsSliderField
            id="timer-font-size"
            aria-label={t("settings.timers.appearance.fontSizeLabel")}
            min={8}
            max={16}
            step={0.5}
            unit="px"
            formatValue={formatFontSize}
            value={displayConfig.fontSize}
            onCommit={(fontSize) =>
              setDisplayConfig({ ...displayConfig, fontSize })
            }
          />
        </SettingsRow>
        <SettingsRow
          label={t("settings.timers.appearance.minWidthLabel")}
          description={t("settings.timers.appearance.minWidthDescription")}
          control="wide"
        >
          <SettingsSliderField
            id="timer-min-width"
            aria-label={t("settings.timers.appearance.minWidthLabel")}
            min={0}
            max={240}
            unit="px"
            value={displayConfig.minColumnWidth}
            onCommit={(minColumnWidth) =>
              setDisplayConfig({ ...displayConfig, minColumnWidth })
            }
          />
        </SettingsRow>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
