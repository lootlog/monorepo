import { Permission } from "@lootlog/schema/permissions";
import type { TFunction } from "i18next";
import * as z from "zod";

export const createRolesFormSchema = (t: TFunction) => {
  const invalidLevel = t("settings.roles.validation.invalidLevel");

  const level = z
    .string()
    .trim()
    .min(1, t("settings.roles.validation.required"))
    .pipe(
      z.coerce
        .number<string>({ error: invalidLevel })
        .int(invalidLevel)
        .min(0, invalidLevel)
        .max(500, invalidLevel),
    );

  return z
    .object({
      lvlRangeFrom: level,
      lvlRangeTo: level,
      permissions: z.partialRecord(z.enum(Permission), z.boolean()),
    })
    .refine((values) => values.lvlRangeFrom <= values.lvlRangeTo, {
      path: ["lvlRangeTo"],
      message: t("settings.roles.validation.levelOrder"),
    });
};

export type RolesFormInput = z.input<ReturnType<typeof createRolesFormSchema>>;
