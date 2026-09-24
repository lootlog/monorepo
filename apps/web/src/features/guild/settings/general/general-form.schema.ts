import * as z from "zod";
import type { TFunction } from "i18next";
import { parseVanityUrl } from "@lootlog/domain/organization-vanity-url";

export const createGeneralFormSchema = (t: TFunction) =>
  z.object({
    vanityUrl: z.string().superRefine((input, context) => {
      if (input === "") return;

      const result = parseVanityUrl(input);

      if (result.success === false) {
        context.addIssue({
          code: "custom",
          message: t(`settings.general.vanityUrl.${result.reason}`),
        });
      }
    }),
    publicStatsCardEnabled: z.boolean(),
  });

export type GeneralFormValues = z.infer<
  ReturnType<typeof createGeneralFormSchema>
>;
