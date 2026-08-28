import { useTranslation } from "react-i18next";
import { ThemeBuilderControlSection } from "./theme-builder-control-section";
import { ThemeBuilderOptionGrid } from "./theme-builder-option-grid";
import type { ThemeBuilderControlGroupProps } from "./theme-builder-types";

const GRID_OPTIONS = ["hidden", "subtle", "strong"] as const;
const STROKE_OPTIONS = ["thin", "default", "bold"] as const;
const FILL_OPTIONS = ["none", "soft"] as const;

export const ThemeBuilderChartControls = ({
  config,
  lockedAxes,
  onConfigChange,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderControlGroupProps) => {
  const { t } = useTranslation();
  const updateChartStyle = (patch: Partial<typeof config.chartStyle>) =>
    onConfigChange({
      ...config,
      chartStyle: { ...config.chartStyle, ...patch },
    });

  return (
    <ThemeBuilderControlSection
      axis="charts"
      title={t("settings.appearance.builder.charts")}
      isLocked={lockedAxes.has("charts")}
      onReset={() => onResetGroup("charts")}
      onToggleLock={() => onToggleLock("charts")}
    >
      <div className="grid grid-cols-5 gap-2">
        {config.charts.map((color, index) => {
          const label = t("settings.appearance.builder.chartColor", {
            number: index + 1,
          });

          return (
            <label
              key={`${index}-${color}`}
              className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-border bg-background p-1 focus-within:border-input-focus focus-within:ring-2 focus-within:ring-ring"
              title={`${label}: ${color}`}
            >
              <input
                type="color"
                value={color}
                aria-label={label}
                className="size-full min-h-9 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                onChange={(event) => {
                  const charts = [...config.charts];
                  charts[index] = event.target.value;
                  onConfigChange({ ...config, charts });
                }}
              />
            </label>
          );
        })}
      </div>
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.chartGrid")}
        options={GRID_OPTIONS}
        value={config.chartStyle.grid}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.chartGrid.${option}`)
        }
        onChange={(grid) => updateChartStyle({ grid })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.chartStroke")}
        options={STROKE_OPTIONS}
        value={config.chartStyle.stroke}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.chartStroke.${option}`)
        }
        onChange={(stroke) => updateChartStyle({ stroke })}
      />
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.chartFill")}
        options={FILL_OPTIONS}
        value={config.chartStyle.fill}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.chartFill.${option}`)
        }
        onChange={(fill) => updateChartStyle({ fill })}
      />
    </ThemeBuilderControlSection>
  );
};
