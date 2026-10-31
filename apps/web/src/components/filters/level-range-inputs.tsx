import { useTranslation } from "react-i18next";
import {
  LevelRangeInputs as LevelRangeFields,
  type LevelRangeInputsProps as LevelRangeFieldsProps,
} from "@lootlog/ui/components/level-range-inputs";

export type LevelRangeInputsProps = Omit<LevelRangeFieldsProps, "labels">;

/** The shared level range fields with the Web app's labels. */
export function LevelRangeInputs(props: LevelRangeInputsProps) {
  const { t } = useTranslation();

  return (
    <LevelRangeFields
      {...props}
      labels={{
        group: t("ui.levelRange.label"),
        min: t("ui.levelRange.min"),
        max: t("ui.levelRange.max"),
        minPlaceholder: t("ui.levelRange.minPlaceholder"),
        maxPlaceholder: t("ui.levelRange.maxPlaceholder"),
      }}
    />
  );
}
