import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimersStore } from "@/store/timers.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TimerAppearancePreview } from "./timer-appearance-preview";

export const TimersSettingsAppearance: FC = () => {
  const { displayConfig, setDisplayConfig } = useTimersStore();
  const { t } = useTranslation();

  return (
    <div className="ll:grid ll:grid-cols-1 ll:gap-3 min-[680px]:ll:grid-cols-[minmax(0,1fr)_220px]">
      <div className="ll:order-2 ll:flex ll:flex-col ll:gap-3 min-[680px]:ll:order-1">
        <SettingsSection
          title={t("settings.timers.appearance.visibilityTitle")}
        >
          <SettingsControlRow
            label={t("settings.timers.appearance.showLevelLabel")}
          >
            <Switch
              checked={displayConfig.showLevel}
              onCheckedChange={(checked) => {
                setDisplayConfig({ ...displayConfig, showLevel: checked });
              }}
              id="show-level"
            />
          </SettingsControlRow>
          <SettingsControlRow
            label={t("settings.timers.appearance.showTypeLabel")}
          >
            <Switch
              checked={displayConfig.showType}
              onCheckedChange={(checked) => {
                setDisplayConfig({ ...displayConfig, showType: checked });
              }}
              id="show-type"
            />
          </SettingsControlRow>
        </SettingsSection>
        <SettingsSection title={t("settings.timers.appearance.layoutTitle")}>
          <SettingsControlRow
            label={t("settings.timers.appearance.singleTimerDisplayModeLabel")}
            description={t(
              "settings.timers.appearance.singleTimerDisplayModeDescription",
            )}
            controlClassName="ll:w-40"
          >
            <ToggleGroup
              type="single"
              size="xs"
              onValueChange={(value: "column" | "row") => {
                if (value) {
                  setDisplayConfig({
                    ...displayConfig,
                    singleTimerDisplayMode: value,
                  });
                }
              }}
              value={displayConfig.singleTimerDisplayMode}
            >
              <ToggleGroupItem value="column">
                {t("settings.timers.appearance.singleTimerDisplayModeColumn")}
              </ToggleGroupItem>
              <ToggleGroupItem value="row">
                {t("settings.timers.appearance.singleTimerDisplayModeRow")}
              </ToggleGroupItem>
            </ToggleGroup>
          </SettingsControlRow>
        </SettingsSection>
        <SettingsSection title={t("settings.timers.appearance.scaleTitle")}>
          <SettingsControlRow
            label={t("settings.timers.appearance.fontSizeLabel")}
            controlClassName="ll:w-40"
          >
            <Slider
              min={8}
              max={16}
              step={0.5}
              value={[displayConfig.fontSize]}
              onValueChange={(value) =>
                setDisplayConfig({ ...displayConfig, fontSize: value[0] })
              }
            />
          </SettingsControlRow>
          <SettingsControlRow
            label={t("settings.timers.appearance.minWidthLabel")}
            controlClassName="ll:w-40"
          >
            <Slider
              min={0}
              max={240}
              step={1}
              value={[displayConfig.minColumnWidth]}
              onValueChange={(value) =>
                setDisplayConfig({
                  ...displayConfig,
                  minColumnWidth: value[0],
                })
              }
            />
          </SettingsControlRow>
        </SettingsSection>
      </div>
      <div className="ll:order-1 min-[680px]:ll:order-2 min-[680px]:ll:pt-5">
        <div className="min-[680px]:ll:sticky min-[680px]:ll:top-2">
          <TimerAppearancePreview />
        </div>
      </div>
    </div>
  );
};
