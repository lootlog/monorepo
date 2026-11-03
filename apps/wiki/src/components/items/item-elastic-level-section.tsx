import { useId } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@lootlog/ui/components/field";
import { CharacterLevelInput } from "@/components/equipment/character-level-input";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";

type ItemElasticLevelSectionProps = {
  item: Pick<CatalogItemDtoOutput, "lvl" | "elasticLevel">;
  /** The level it has for the set's character. */
  level: number;
};

/**
 * An elastic item's level: the set's character level it follows, or the
 * level it shows at without one. An item of fixed level has none.
 */
export function ItemElasticLevelSection({
  item,
  level,
}: ItemElasticLevelSectionProps) {
  const { set } = useEquipmentSet();
  const inputId = useId();
  const statusId = useId();

  if (!item.elasticLevel) return null;

  const status =
    set.level === null
      ? t("elastic.defaultLevel", { level })
      : t("elastic.itemLevel", { level });

  return (
    <section
      aria-labelledby="item-elastic-level"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="item-elastic-level"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {t("elastic.title")}
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          {t("elastic.description")}
        </p>
      </div>
      <Field className="max-w-60">
        <FieldLabel htmlFor={inputId}>{t("equipment.level")}</FieldLabel>
        <CharacterLevelInput id={inputId} aria-describedby={statusId} />
        <FieldDescription id={statusId} aria-live="polite">
          {status}
        </FieldDescription>
      </Field>
      {level === item.lvl ? null : (
        <p className="text-xs text-pretty text-muted-foreground">
          {t("elastic.computed")}
        </p>
      )}
    </section>
  );
}
