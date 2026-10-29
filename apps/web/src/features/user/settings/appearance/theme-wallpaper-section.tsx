import { BandSection } from "@/components/common/band-section";
import { getBuiltInThemePreview } from "@/themes/theme-preview";
import { WALLPAPERS, type Wallpaper } from "@lootlog/ui/themes/wallpapers";
import { cn } from "cn";
import { Check } from "lucide-react";
import { useId } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ThemeEditorFormValues } from "./theme-editor-form.schema";

type WallpaperOption = {
  value: string;
  label: string;
  image: string | null;
  color: string;
};

const CATEGORY_ORDER: Wallpaper["category"][] = [
  "themes",
  "fantasy",
  "abstract",
  "seasons",
  "anime",
];

/** The wallpaper behind the content: the base's, none, or a shipped one. */
export const ThemeWallpaperSection = () => {
  const { t } = useTranslation();
  const name = useId();
  const { control, setValue } = useFormContext<ThemeEditorFormValues>();
  const definition = useWatch({ control, name: "definition" });
  const base = getBuiltInThemePreview(definition.baseThemeId);

  const update = (next: ThemeEditorFormValues["definition"]) =>
    setValue("definition", next, { shouldDirty: true });

  const wallpaperLabel = (wallpaper: Wallpaper) =>
    wallpaper.themeId
      ? t(`settings.appearance.themes.${wallpaper.themeId}.title`)
      : t(`settings.appearance.wallpapers.${wallpaper.id}`);

  const groups: { label: string; options: WallpaperOption[] }[] = [
    {
      label: t("settings.appearance.editor.wallpaper.title"),
      options: [
        {
          value: "base",
          label: t("settings.appearance.editor.wallpaper.base"),
          image: base.image,
          color: base.color,
        },
        {
          value: "none",
          label: t("settings.appearance.editor.wallpaper.none"),
          image: null,
          color: base.color,
        },
      ],
    },
    ...CATEGORY_ORDER.flatMap((category) => {
      const options = WALLPAPERS.filter(
        (wallpaper) => wallpaper.category === category,
      ).map((wallpaper) => ({
        value: wallpaper.id,
        label: wallpaperLabel(wallpaper),
        image: wallpaper.preview,
        color: base.color,
      }));

      return options.length > 0
        ? [
            {
              label: t(
                `settings.appearance.editor.wallpaper.categories.${category}`,
              ),
              options,
            },
          ]
        : [];
    }),
  ];

  return (
    <BandSection
      id="theme-editor-wallpaper"
      title={t("settings.appearance.editor.wallpaper.title")}
      wide
    >
      <div
        role="radiogroup"
        aria-labelledby="theme-editor-wallpaper"
        className="flex flex-col gap-5"
      >
        {groups.map((group, index) => (
          <div key={group.label} className="flex flex-col gap-2">
            {index > 0 && (
              <p className="text-xs font-medium text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {group.options.map((option) => {
                const isChecked = definition.wallpaper === option.value;

                return (
                  <label
                    key={option.value}
                    className="group/wallpaper relative flex cursor-pointer flex-col gap-1.5"
                  >
                    <input
                      type="radio"
                      name={name}
                      value={option.value}
                      checked={isChecked}
                      onChange={() =>
                        update({ ...definition, wallpaper: option.value })
                      }
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "relative block aspect-[2/1] w-full overflow-hidden rounded-md border bg-cover bg-center bg-no-repeat transition-[border-color,box-shadow] peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                        isChecked
                          ? "border-primary ring-1 ring-primary"
                          : "border-border group-hover/wallpaper:border-primary/50",
                      )}
                      style={{
                        backgroundColor: option.color,
                        backgroundImage: option.image
                          ? `url("${option.image}")`
                          : undefined,
                      }}
                    >
                      {isChecked && (
                        <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </BandSection>
  );
};
