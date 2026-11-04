import {
  CUSTOM_THEME_NAME_MAX_LENGTH,
  type CustomThemeDefinition,
} from "@lootlog/schema/custom-theme";
import type { TFunction } from "i18next";
import { Schema } from "effect";

/** The editor's draft: the definition's controls build it, so it is trusted. */
export const createThemeEditorFormSchema = (t: TFunction) =>
  Schema.toStandardSchemaV1(
    Schema.Struct({
      name: Schema.Trim.check(
        Schema.isMinLength(1, {
          message: t("settings.appearance.editor.nameRequired"),
        }),
        Schema.isMaxLength(CUSTOM_THEME_NAME_MAX_LENGTH),
      ),
      definition: Schema.declare(
        (_input): _input is CustomThemeDefinition => true,
      ),
    }),
  );

export type ThemeEditorFormValues = ReturnType<
  typeof createThemeEditorFormSchema
>["Encoded"];
