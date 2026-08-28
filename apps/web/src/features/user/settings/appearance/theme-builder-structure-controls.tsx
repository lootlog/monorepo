import { useTranslation } from "react-i18next";
import { ThemeBuilderControlSection } from "./theme-builder-control-section";
import { ThemeBuilderOptionGrid } from "./theme-builder-option-grid";
import type { ThemeBuilderControlGroupProps } from "./theme-builder-types";

const RADIUS_OPTIONS = ["sharp", "compact", "default", "round"] as const;
const DENSITY_OPTIONS = ["compact", "standard", "comfortable"] as const;
const SURFACE_OPTIONS = ["flat", "raised", "floating"] as const;
const BORDER_OPTIONS = ["none", "subtle", "strong"] as const;

export const ThemeBuilderStructureControls = ({
  config,
  lockedAxes,
  onConfigChange,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderControlGroupProps) => {
  const { t } = useTranslation();

  return (
    <ThemeBuilderControlSection
      axis="surfaces"
      title={t("settings.appearance.builder.surfaces")}
      description={t("settings.appearance.builder.surfacesDescription")}
      isLocked={lockedAxes.has("surfaces")}
      onReset={() => onResetGroup("surfaces")}
      onToggleLock={() => onToggleLock("surfaces")}
    >
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.surface")}
        options={SURFACE_OPTIONS}
        value={config.surface}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.surface.${option}`)
        }
        onChange={(surface) => onConfigChange({ ...config, surface })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.border")}
        options={BORDER_OPTIONS}
        value={config.border}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.border.${option}`)
        }
        onChange={(border) => onConfigChange({ ...config, border })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.radius")}
        options={RADIUS_OPTIONS}
        value={config.radius}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.radius.${option}`)
        }
        onChange={(radius) => onConfigChange({ ...config, radius })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.density")}
        options={DENSITY_OPTIONS}
        value={config.density}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.density.${option}`)
        }
        onChange={(density) => onConfigChange({ ...config, density })}
      />
    </ThemeBuilderControlSection>
  );
};
