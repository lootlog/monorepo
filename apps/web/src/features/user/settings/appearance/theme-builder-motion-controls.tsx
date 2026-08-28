import { useTranslation } from "react-i18next";
import { ThemeBuilderControlSection } from "./theme-builder-control-section";
import { ThemeBuilderOptionGrid } from "./theme-builder-option-grid";
import type { ThemeBuilderControlGroupProps } from "./theme-builder-types";

const MOTION_OPTIONS = ["quiet", "standard", "expressive"] as const;

export const ThemeBuilderMotionControls = ({
  config,
  lockedAxes,
  onConfigChange,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderControlGroupProps) => {
  const { t } = useTranslation();

  return (
    <ThemeBuilderControlSection
      axis="motion"
      title={t("settings.appearance.builder.motion")}
      isLocked={lockedAxes.has("motion")}
      onReset={() => onResetGroup("motion")}
      onToggleLock={() => onToggleLock("motion")}
    >
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.motion")}
        options={MOTION_OPTIONS}
        value={config.motion}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.motion.${option}`)
        }
        onChange={(motion) => onConfigChange({ ...config, motion })}
      />
    </ThemeBuilderControlSection>
  );
};
