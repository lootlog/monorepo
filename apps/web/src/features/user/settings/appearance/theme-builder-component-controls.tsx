import { getThemeRecipeComponents, type ThemeConfigV1 } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { ThemeBuilderControlSection } from "./theme-builder-control-section";
import { ThemeBuilderOptionGrid } from "./theme-builder-option-grid";
import type { ThemeBuilderControlGroupProps } from "./theme-builder-types";

const RECIPES = ["signal", "solid", "soft", "outline"] as const;

const COMPONENT_OPTIONS = {
  button: ["solid", "soft", "outline", "minimal"],
  card: ["solid", "soft", "outline"],
  input: ["outline", "filled", "underline"],
  badge: ["solid", "soft", "outline"],
  table: ["plain", "striped", "separated"],
} as const satisfies {
  [Component in keyof ThemeConfigV1["components"]]: readonly ThemeConfigV1["components"][Component][];
};

export const ThemeBuilderComponentControls = ({
  config,
  lockedAxes,
  onConfigChange,
  onResetGroup,
  onToggleLock,
}: ThemeBuilderControlGroupProps) => {
  const { t } = useTranslation();

  return (
    <ThemeBuilderControlSection
      axis="components"
      title={t("settings.appearance.builder.components")}
      description={t("settings.appearance.builder.componentsDescription")}
      isLocked={lockedAxes.has("components")}
      onReset={() => onResetGroup("components")}
      onToggleLock={() => onToggleLock("components")}
    >
      <ThemeBuilderOptionGrid
        label={t("settings.appearance.builder.recipe")}
        options={RECIPES}
        value={config.recipe}
        getOptionLabel={(option) =>
          t(`settings.appearance.options.recipe.${option}`)
        }
        onChange={(recipe) =>
          onConfigChange({
            ...config,
            recipe,
            components: getThemeRecipeComponents(recipe),
          })
        }
      />
      {config.recipe === "custom" ? (
        <p className="rounded-lg bg-surface-selected px-3 py-2 text-xs text-foreground">
          {t("settings.appearance.builder.customRecipe")}
        </p>
      ) : null}
      {(
        Object.keys(COMPONENT_OPTIONS) as (keyof typeof COMPONENT_OPTIONS)[]
      ).map((component) => (
        <ThemeBuilderOptionGrid
          key={component}
          label={t(`settings.appearance.options.components.${component}.label`)}
          options={COMPONENT_OPTIONS[component]}
          value={config.components[component]}
          getOptionLabel={(option) =>
            t(`settings.appearance.options.components.${component}.${option}`)
          }
          onChange={(value) =>
            onConfigChange({
              ...config,
              recipe: "custom",
              components: { ...config.components, [component]: value },
            })
          }
        />
      ))}
    </ThemeBuilderControlSection>
  );
};
