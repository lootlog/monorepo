import { useTranslation } from "react-i18next";
import { ThemeBuilderControlSection } from "./theme-builder-control-section";
import { ThemeBuilderOptionGrid } from "./theme-builder-option-grid";
import type { ThemeBuilderControlGroupProps } from "./theme-builder-types";

const FONT_OPTIONS = ["geist", "inter", "manrope"] as const;
const HEADING_WEIGHT_OPTIONS = ["medium", "semibold", "bold"] as const;
const BODY_WEIGHT_OPTIONS = ["regular", "medium"] as const;
const TRACKING_OPTIONS = ["tight", "normal", "relaxed"] as const;

export const ThemeBuilderTypographyControls = ({
  config,
  lockedAxes,
  onConfigChange,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderControlGroupProps) => {
  const { t } = useTranslation();
  const updateTypography = (patch: Partial<typeof config.typography>) =>
    onConfigChange({
      ...config,
      typography: { ...config.typography, ...patch },
    });

  return (
    <ThemeBuilderControlSection
      axis="typography"
      title={t("settings.appearance.builder.typography")}
      isLocked={lockedAxes.has("typography")}
      onReset={() => onResetGroup("typography")}
      onToggleLock={() => onToggleLock("typography")}
    >
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.headingFont")}
        options={FONT_OPTIONS}
        value={config.typography.heading}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.font.${option}`)
        }
        onChange={(heading) => updateTypography({ heading })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.bodyFont")}
        options={FONT_OPTIONS}
        value={config.typography.body}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.font.${option}`)
        }
        onChange={(body) => updateTypography({ body })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.headingWeight")}
        options={HEADING_WEIGHT_OPTIONS}
        value={config.typography.headingWeight}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.weight.${option}`)
        }
        onChange={(headingWeight) => updateTypography({ headingWeight })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.bodyWeight")}
        options={BODY_WEIGHT_OPTIONS}
        value={config.typography.bodyWeight}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.weight.${option}`)
        }
        onChange={(bodyWeight) => updateTypography({ bodyWeight })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.tracking")}
        options={TRACKING_OPTIONS}
        value={config.typography.tracking}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.tracking.${option}`)
        }
        onChange={(tracking) => updateTypography({ tracking })}
      />
    </ThemeBuilderControlSection>
  );
};
