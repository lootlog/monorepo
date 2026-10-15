import {
  CUSTOM_THEME_NAME_MAX_LENGTH,
  type CustomThemeDefinition,
} from "@lootlog/schema/custom-theme";
import type { TFunction } from "i18next";
import * as z from "zod";

/** The editor's draft: the definition's controls build it, so it is trusted. */
export const createThemeEditorFormSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("settings.appearance.editor.nameRequired"))
      .max(CUSTOM_THEME_NAME_MAX_LENGTH),
    definition: z.custom<CustomThemeDefinition>(),
  });

export type ThemeEditorFormValues = z.input<
  ReturnType<typeof createThemeEditorFormSchema>
>;
