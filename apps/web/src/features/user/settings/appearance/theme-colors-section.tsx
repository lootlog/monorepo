import { BandSection } from "@/components/common/band-section";
import { ColorHexField } from "@/components/common/color-hex-field";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { surfaceFromColor } from "@lootlog/ui/themes/custom-theme";
import { useRootColors } from "@/themes/root-colors";
import { withAccent, withSurface } from "@lootlog/domain/custom-theme";
import { CUSTOM_THEME_TOKEN_KEYS } from "@lootlog/schema/custom-theme";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { Slider } from "@lootlog/ui/components/slider";
import { cn } from "cn";
import { omit } from "es-toolkit";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ThemeEditorFormValues } from "./theme-editor-form.schema";
import { ThemeSettingRow } from "./theme-setting-row";

/** The shipped themes' cover, where the slider starts before it is moved. */
const DEFAULT_TRANSPARENCY = 50;

/**
 * The theme's colours as the page shows them: the accent, the background,
 * how much wallpaper shows through, and every other colour on request.
 */
export const ThemeColorsSection = () => {
  const { t } = useTranslation();
  const transparencyLabelId = useId();
  const [showAllColors, setShowAllColors] = useState(false);
  const { control, setValue } = useFormContext<ThemeEditorFormValues>();
  const definition = useWatch({ control, name: "definition" });
  // The page already previews the draft, so it shows every colour as set.
  const pageColors = useRootColors();
  const hasWallpaper = definition.wallpaper !== "none";

  const update = (next: ThemeEditorFormValues["definition"]) =>
    setValue("definition", next, { shouldDirty: true });

  const colorField = (
    label: string,
    value: string | undefined,
    onChange: (color: string) => void,
  ) => (
    <ColorHexField
      label={label}
      hexLabel={t("settings.appearance.editor.colors.hexLabel", {
        name: label,
      })}
      value={value ?? "#000000"}
      onChange={onChange}
    />
  );

  const accentLabel = t("settings.appearance.editor.colors.accent");
  const backgroundLabel = t("settings.appearance.editor.colors.background");
  const separatorLabel = t("settings.appearance.editor.tokens.separator");

  return (
    <BandSection
      id="theme-editor-colors"
      title={t("settings.appearance.editor.colors.title")}
      tiled
    >
      <ul>
        <ThemeSettingRow
          label={accentLabel}
          description={t("settings.appearance.editor.colors.accentDescription")}
          onReset={
            definition.accent === undefined
              ? undefined
              : () => update(omit(definition, ["accent"]))
          }
        >
          {colorField(accentLabel, pageColors.primary, (accent) =>
            update(withAccent(definition, accent)),
          )}
        </ThemeSettingRow>

        <ThemeSettingRow
          label={backgroundLabel}
          description={t(
            "settings.appearance.editor.colors.backgroundDescription",
          )}
          onReset={
            definition.surface === undefined
              ? undefined
              : () => update(omit(definition, ["surface"]))
          }
        >
          {colorField(backgroundLabel, pageColors.background, (color) =>
            update(withSurface(definition, surfaceFromColor(color))),
          )}
        </ThemeSettingRow>

        <ThemeSettingRow
          label={separatorLabel}
          description={t(
            "settings.appearance.editor.colors.separatorDescription",
          )}
          onReset={
            definition.overrides.separator === undefined
              ? undefined
              : () =>
                  update({
                    ...definition,
                    overrides: omit(definition.overrides, ["separator"]),
                  })
          }
        >
          {colorField(separatorLabel, pageColors.separator, (color) =>
            update({
              ...definition,
              overrides: { ...definition.overrides, separator: color },
            }),
          )}
        </ThemeSettingRow>

        <ThemeSettingRow
          label={t("settings.appearance.editor.colors.transparency")}
          labelId={transparencyLabelId}
          description={
            hasWallpaper
              ? t("settings.appearance.editor.colors.transparencyDescription")
              : t("settings.appearance.editor.colors.transparencyNone")
          }
          onReset={
            definition.wallpaperVisibility === undefined
              ? undefined
              : () => update(omit(definition, ["wallpaperVisibility"]))
          }
        >
          <span className="flex w-44 items-center gap-3">
            <Slider
              aria-labelledby={transparencyLabelId}
              disabled={!hasWallpaper}
              min={0}
              max={100}
              step={5}
              value={[definition.wallpaperVisibility ?? DEFAULT_TRANSPARENCY]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;

                if (next !== undefined) {
                  update({ ...definition, wallpaperVisibility: next });
                }
              }}
            />
            <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {definition.wallpaperVisibility ?? DEFAULT_TRANSPARENCY}%
            </span>
          </span>
        </ThemeSettingRow>
      </ul>

      <Collapsible open={showAllColors} onOpenChange={setShowAllColors}>
        <CollapsibleTrigger
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 py-2.5 text-left text-sm font-medium outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            LIST_TILE_RULE_CLASS,
            LIST_TILE_INSET_CLASS,
          )}
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 text-muted-foreground transition-transform motion-reduce:transition-none",
              showAllColors && "rotate-180",
            )}
          />
          {t("settings.appearance.editor.colors.more")}
          <span className="text-xs font-normal text-muted-foreground">
            {t("settings.appearance.editor.colors.moreDescription")}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul>
            {/* The separator has its own row above. */}
            {CUSTOM_THEME_TOKEN_KEYS.filter(
              (token) => token !== "separator",
            ).map((token) => {
              const label = t(`settings.appearance.editor.tokens.${token}`);

              return (
                <ThemeSettingRow
                  key={token}
                  label={label}
                  onReset={
                    definition.overrides[token] === undefined
                      ? undefined
                      : () =>
                          update({
                            ...definition,
                            overrides: omit(definition.overrides, [token]),
                          })
                  }
                >
                  {colorField(label, pageColors[token], (color) =>
                    update({
                      ...definition,
                      overrides: { ...definition.overrides, [token]: color },
                    }),
                  )}
                </ThemeSettingRow>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </BandSection>
  );
};
