import { Schema } from "effect";
import type { TFunction } from "i18next";
import { parseVanityUrl } from "@lootlog/domain/organization-vanity-url";

export const createGeneralFormSchema = (t: TFunction) =>
  Schema.toStandardSchemaV1(
    Schema.Struct({
      vanityUrl: Schema.String.check(
        Schema.makeFilter((input) => {
          if (input === "") return;

          const result = parseVanityUrl(input);

          return result.success === false
            ? t(`settings.general.vanityUrl.${result.reason}`)
            : undefined;
        }),
      ),
      publicStatsCardEnabled: Schema.Boolean,
    }),
  );

export type GeneralFormValues = ReturnType<
  typeof createGeneralFormSchema
>["Type"];
