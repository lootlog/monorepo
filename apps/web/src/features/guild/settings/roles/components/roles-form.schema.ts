import { Permission } from "@lootlog/schema/permissions";
import type { TFunction } from "i18next";
import { Schema, SchemaTransformation } from "effect";

export const createRolesFormSchema = (t: TFunction) => {
  const invalidLevel = t("settings.roles.validation.invalidLevel");

  const level = Schema.Trim.check(
    Schema.isNonEmpty({ message: t("settings.roles.validation.required") }),
  ).pipe(
    Schema.decodeTo(
      Schema.Finite.annotate({ message: invalidLevel }),
      SchemaTransformation.numberFromString,
    ),
  );

  const isLevel = (value: number) =>
    Number.isSafeInteger(value) && value >= 0 && value <= 500;

  return Schema.toStandardSchemaV1(
    Schema.Struct({
      lvlRangeFrom: level,
      lvlRangeTo: level,
      permissions: Schema.Record(
        Schema.Enum(Permission),
        Schema.optionalKey(Schema.Boolean),
      ),
    }).check(
      // An out-of-range level still gets compared, so both fields report.
      Schema.makeFilter((values) => {
        const issues: Array<Schema.FilterIssue> = [];

        if (!isLevel(values.lvlRangeFrom)) {
          issues.push({ path: ["lvlRangeFrom"], issue: invalidLevel });
        }

        if (!isLevel(values.lvlRangeTo)) {
          issues.push({ path: ["lvlRangeTo"], issue: invalidLevel });
        }

        if (values.lvlRangeFrom > values.lvlRangeTo) {
          issues.push({
            path: ["lvlRangeTo"],
            issue: t("settings.roles.validation.levelOrder"),
          });
        }

        return issues;
      }),
    ),
  );
};

export type RolesFormInput = ReturnType<
  typeof createRolesFormSchema
>["Encoded"];
