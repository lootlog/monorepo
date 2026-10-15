import { BandSection } from "@/components/common/band-section";
import { DetailPage } from "@/components/common/detail-page";
import { WALLPAPERS } from "@/themes/wallpapers";
import { randomizeCustomTheme } from "@lootlog/domain/custom-theme";
import { Button } from "@lootlog/ui/components/button";
import { Dices } from "lucide-react";
import { OptionCardGroup } from "@/components/common/option-card-group";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useUpdateUserTheme } from "@/hooks/api/user/use-user-themes";
import { useTheme } from "@/hooks/context/use-theme";
import { CUSTOM_THEME_FONTS } from "@/themes/custom-theme";
import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserThemeResponseDto } from "@lootlog/client/main";
import {
  CUSTOM_THEME_FONT_IDS,
  CUSTOM_THEME_RADIUS_STEPS,
} from "@lootlog/schema/custom-theme";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { isEqual } from "es-toolkit";
import { useEffect, useRef, type ComponentProps } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  createThemeEditorFormSchema,
  type ThemeEditorFormValues,
} from "./theme-editor-form.schema";
import { ThemeColorsSection } from "./theme-colors-section";
import { ThemeWallpaperSection } from "./theme-wallpaper-section";

const toFormValues = (theme: UserThemeResponseDto): ThemeEditorFormValues => ({
  name: theme.name,
  definition: theme.definition,
});

type ThemeEditorFormProps = Omit<
  ComponentProps<typeof DetailPage>,
  "children"
> & {
  theme: UserThemeResponseDto;
};

/**
 * The editor's controls. The whole app previews the draft while the editor is
 * open and returns to the saved theme when it closes.
 */
export const ThemeEditorForm = ({
  theme,
  actions,
  ...page
}: ThemeEditorFormProps) => {
  const { t } = useTranslation();
  const { setPreview } = useTheme();
  const updateTheme = useUpdateUserTheme();

  const form = useForm<ThemeEditorFormValues>({
    resolver: zodResolver(createThemeEditorFormSchema(t)),
    defaultValues: toFormValues(theme),
  });

  const definition = useWatch({
    control: form.control,
    name: "definition",
  });

  // The form hands out a fresh copy on each render; only a real change
  // repaints the app.
  const previewed = useRef<ThemeEditorFormValues["definition"] | null>(null);

  useEffect(() => {
    if (isEqual(previewed.current, definition)) return;
    previewed.current = definition;
    setPreview(definition);
  }, [definition, setPreview]);

  useEffect(
    () => () => {
      previewed.current = null;
      setPreview(null);
    },
    [setPreview],
  );

  // The font picker shows each font in itself.
  useEffect(() => {
    for (const font of Object.values(CUSTOM_THEME_FONTS)) void font.load?.();
  }, []);

  const onSubmit = (values: ThemeEditorFormValues) => {
    if (updateTheme.isPending) return;

    updateTheme.mutate(
      { themeId: theme.id, payload: values },
      {
        onSuccess: (saved) => {
          toast.success(t("settings.appearance.editor.saved"));
          form.reset(toFormValues(saved));
        },
        onError: () => toast.error(t("settings.appearance.editor.saveError")),
      },
    );
  };

  const randomize = () =>
    form.setValue(
      "definition",
      randomizeCustomTheme({
        baseThemeId: definition.baseThemeId,
        wallpapers: WALLPAPERS.map(({ id }) => id),
      }),
      { shouldDirty: true },
    );

  return (
    <Form {...form}>
      <DetailPage
        {...page}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon=<Dices className="size-4" />
              onClick={randomize}
            >
              {t("settings.appearance.editor.randomize")}
            </Button>
            {actions}
          </>
        }
      >
        {/* Room below the last section for the docked save bar. */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="pb-24"
          noValidate
        >
          <BandSection
            id="theme-editor-name"
            title={t("settings.appearance.editor.nameSection")}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={40}
                      aria-label={t("settings.appearance.editor.nameLabel")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </BandSection>

          <ThemeColorsSection />

          <ThemeWallpaperSection />

          <BandSection
            id="theme-editor-font"
            title={t("settings.appearance.editor.font.title")}
            wide
          >
            <FormField
              control={form.control}
              name="definition.font"
              render={({ field }) => (
                <OptionCardGroup
                  aria-labelledby="theme-editor-font"
                  value={field.value}
                  onChange={field.onChange}
                  className="lg:grid-cols-3 xl:grid-cols-4"
                  options={CUSTOM_THEME_FONT_IDS.map((font) => ({
                    value: font,
                    title: CUSTOM_THEME_FONTS[font].label,
                    description: t("settings.appearance.editor.font.sample"),
                    style: {
                      fontFamily: `"${CUSTOM_THEME_FONTS[font].family}"`,
                    },
                  }))}
                />
              )}
            />
          </BandSection>

          <BandSection
            id="theme-editor-radius"
            title={t("settings.appearance.editor.radius.title")}
          >
            <FormField
              control={form.control}
              name="definition.radius"
              render={({ field }) => (
                <ToggleGroup
                  variant="outline"
                  size="sm"
                  spacing={1.5}
                  value={[field.value]}
                  // One step is always chosen: pressing it again keeps it.
                  onValueChange={([pressed]) => {
                    const step = CUSTOM_THEME_RADIUS_STEPS.find(
                      (value) => value === pressed,
                    );

                    if (step) field.onChange(step);
                  }}
                  aria-label={t("settings.appearance.editor.radius.label")}
                  className="flex-wrap"
                >
                  {CUSTOM_THEME_RADIUS_STEPS.map((step) => (
                    <ToggleGroupItem
                      key={step}
                      value={step}
                      className={FILTER_PILL_CLASS}
                    >
                      {t(`settings.appearance.editor.radius.${step}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            />
          </BandSection>

          <UnsavedChangesBar
            isDirty={form.formState.isDirty}
            isSubmitting={updateTheme.isPending}
            onReset={() => form.reset()}
            unsavedChangesLabel={t("settings.appearance.editor.unsavedChanges")}
          />
        </form>
      </DetailPage>
    </Form>
  );
};
