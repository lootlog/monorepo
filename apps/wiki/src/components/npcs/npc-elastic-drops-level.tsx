import { useId } from "react";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@lootlog/ui/components/field";
import { CharacterLevelInput } from "@/components/equipment/character-level-input";
import { t } from "@/i18n/messages";

/** The character level a monster's elastic drops show at. */
export function NpcElasticDropsLevel() {
  const inputId = useId();
  const hintId = useId();

  return (
    <Field className="max-w-xl">
      <FieldLabel htmlFor={inputId}>{t("equipment.level")}</FieldLabel>
      <CharacterLevelInput
        id={inputId}
        aria-describedby={hintId}
        className="max-w-28"
      />
      <FieldDescription id={hintId}>{t("elastic.dropsHint")}</FieldDescription>
    </Field>
  );
}
