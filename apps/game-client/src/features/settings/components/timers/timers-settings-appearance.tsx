import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsSliderField } from "@/components/settings/settings-slider-field";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import {
  SettingsChoiceCards,
  type SettingsChoiceOption,
} from "@/components/settings/settings-choice-card";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getTimersModernAppearancePreset } from "@lootlog/domain/timers-modern-appearance";
import {
  TIMERS_MODERN_FONT_SCALE_MAX_PERCENT,
  TIMERS_MODERN_FONT_SCALE_MIN_PERCENT,
  TIMERS_MODERN_GAP_MAX_PX,
  TIMERS_MODERN_GAP_MIN_PX,
  TIMERS_MODERN_MIN_COLUMN_WIDTH_MAX_PX,
  TIMERS_MODERN_MIN_COLUMN_WIDTH_MIN_PX,
} from "@lootlog/schema/timer-settings";
import { setTimerDisplayConfig } from "@/features/timers/settings/timer-settings-writers";
import { useTimerAppearanceSettings } from "@/features/timers/settings/use-timer-settings";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useTimersModernAppearanceDraft } from "./use-timers-modern-appearance-draft";

const formatFontSize = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(1)}px`;

const MODERN_SWITCHES = [
  "showHeader",
  "showFiltersBar",
  "showFooter",
  "showTypeBadge",
  "showLevel",
  "showProgress",
] as const;

type ModernPresetChoice = "comfortable" | "compact";

export const TimersSettingsAppearance: FC = () => {
  const { displayConfig } = useTimerAppearanceSettings().appearance;
  const setDisplayConfig = setTimerDisplayConfig;
  const { t } = useTranslation();

  const { draft, updateDraft, commit, updateAndCommit, applyPreset } =
    useTimersModernAppearanceDraft();

  const activePreset = getTimersModernAppearancePreset(draft);

  // Hand-tuned values leave every preset card unselected.
  const selectedPreset: ModernPresetChoice | null =
    activePreset === "custom" ? null : activePreset;

  const presetOptions: SettingsChoiceOption<ModernPresetChoice>[] = [
    {
      value: "comfortable",
      title: t("timers:modernAppearance.presets.comfortable"),
      description: t("timers:modernAppearance.presets.comfortableDescription"),
    },
    {
      value: "compact",
      title: t("timers:modernAppearance.presets.compact"),
      description: t("timers:modernAppearance.presets.compactDescription"),
    },
  ];

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="timers-modern-appearance"
        title={t("timers:modernAppearance.presetSection")}
      >
        <SettingsChoiceCards
          id="timers-modern-preset"
          label={t("timers:modernAppearance.presetLabel")}
          options={presetOptions}
          value={selectedPreset}
          onChange={applyPreset}
        />
      </SettingsSection>

      <SettingsSection title={t("timers:modernAppearance.scaleSection")}>
        <SettingsRow
          settingKeys={["appearance.timers.modern"]}
          label={t("timers:modernAppearance.fontScaleLabel")}
          description={t("timers:modernAppearance.fontScaleDescription")}
          control="wide"
        >
          <SettingsSliderField
            id="timers-modern-font-scale"
            aria-label={t("timers:modernAppearance.fontScaleLabel")}
            min={TIMERS_MODERN_FONT_SCALE_MIN_PERCENT}
            max={TIMERS_MODERN_FONT_SCALE_MAX_PERCENT}
            step={5}
            unit="%"
            value={draft.fontScalePercent}
            onValueChange={(fontScalePercent) =>
              updateDraft({ fontScalePercent })
            }
            onCommit={(fontScalePercent) => commit({ fontScalePercent })}
          />
        </SettingsRow>
        <SettingsRow
          settingKeys={["appearance.timers.modern"]}
          label={t("timers:modernAppearance.gapLabel")}
          control="wide"
        >
          <SettingsSliderField
            id="timers-modern-gap"
            aria-label={t("timers:modernAppearance.gapLabel")}
            min={TIMERS_MODERN_GAP_MIN_PX}
            max={TIMERS_MODERN_GAP_MAX_PX}
            unit="px"
            value={draft.gapPx}
            onValueChange={(gapPx) => updateDraft({ gapPx })}
            onCommit={(gapPx) => commit({ gapPx })}
          />
        </SettingsRow>
        <SettingsRow
          settingKeys={["appearance.timers.modern"]}
          label={t("timers:modernAppearance.minColumnWidthLabel")}
          description={t("timers:modernAppearance.minColumnWidthDescription")}
          control="wide"
        >
          <SettingsSliderField
            id="timers-modern-min-column"
            aria-label={t("timers:modernAppearance.minColumnWidthLabel")}
            min={TIMERS_MODERN_MIN_COLUMN_WIDTH_MIN_PX}
            max={TIMERS_MODERN_MIN_COLUMN_WIDTH_MAX_PX}
            step={10}
            unit="px"
            value={draft.minColumnWidth}
            onValueChange={(minColumnWidth) => updateDraft({ minColumnWidth })}
            onCommit={(minColumnWidth) => commit({ minColumnWidth })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("timers:modernAppearance.visibilitySection")}>
        {MODERN_SWITCHES.map((key) => (
          <SettingsRow
            key={key}
            settingKeys={["appearance.timers.modern"]}
            htmlFor={`timers-modern-${key}`}
            label={t(`timers:modernAppearance.switches.${key}`)}
            description={t(
              `timers:modernAppearance.switches.${key}Description`,
            )}
          >
            <Switch
              id={`timers-modern-${key}`}
              checked={draft[key]}
              onCheckedChange={(checked) => {
                updateAndCommit({ [key]: checked });
              }}
            />
          </SettingsRow>
        ))}
      </SettingsSection>

      <SettingsSection
        controlId="timer-visibility"
        title={t("settings.timers.appearance.visibilityTitle")}
        description={t("timers:modernAppearance.legacyNote")}
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
        description={t("timers:modernAppearance.legacyNote")}
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
        description={t("timers:modernAppearance.legacyNote")}
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
