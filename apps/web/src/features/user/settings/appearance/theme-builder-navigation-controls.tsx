import { useTranslation } from "react-i18next";
import { ThemeBuilderControlSection } from "./theme-builder-control-section";
import { ThemeBuilderOptionGrid } from "./theme-builder-option-grid";
import type { ThemeBuilderControlGroupProps } from "./theme-builder-types";

const SURFACE_OPTIONS = ["solid", "subtle"] as const;
const ACTIVE_OPTIONS = ["filled", "line"] as const;

export const ThemeBuilderNavigationControls = ({
  config,
  lockedAxes,
  onConfigChange,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderControlGroupProps) => {
  const { t } = useTranslation();

  return (
    <ThemeBuilderControlSection
      axis="navigation"
      title={t("settings.appearance.builder.navigation")}
      isLocked={lockedAxes.has("navigation")}
      onReset={() => onResetGroup("navigation")}
      onToggleLock={() => onToggleLock("navigation")}
    >
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.navigationSurface")}
        options={SURFACE_OPTIONS}
        value={config.navigation.surface}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.navigationSurface.${option}`)
        }
        onChange={(surface) =>
          onConfigChange({
            ...config,
            navigation: { ...config.navigation, surface },
          })
        }
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.navigationActive")}
        options={ACTIVE_OPTIONS}
        value={config.navigation.active}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.navigationActive.${option}`)
        }
        onChange={(active) =>
          onConfigChange({
            ...config,
            navigation: { ...config.navigation, active },
          })
        }
      />
    </ThemeBuilderControlSection>
  );
};
