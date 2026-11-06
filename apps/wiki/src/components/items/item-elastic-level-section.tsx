import { useId } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@lootlog/ui/components/field";
import { LevelInput } from "@/components/equipment/level-input";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";

type ItemElasticLevelSectionProps = {
  item: Pick<CatalogItemDtoOutput, "lvl" | "elasticLevel">;
  /** The level it shows at. */
  level: number;
  /** The character level typed to preview it at, which the set keeps. */
  previewLevel: number | undefined;
  onPreviewLevelChange: (level: number | undefined) => void;
};

/**
 * An elastic item's level: the one a typed character level would loot it
 * at, else the set's character's, else the level it shows at without one.
 * An item of fixed level has none.
 */
export function ItemElasticLevelSection({
  item,
  level,
  previewLevel,
  onPreviewLevelChange,
}: ItemElasticLevelSectionProps) {
  const { set } = useEquipmentSet();
  const inputId = useId();
  const statusId = useId();

  if (!item.elasticLevel) return null;

  const status =
    previewLevel !== undefined
      ? t("elastic.previewLevel", { character: previewLevel, level })
      : set.level !== null
        ? t("elastic.itemLevel", { level })
        : t("elastic.defaultLevel", { level });

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
        <LevelInput
          id={inputId}
          aria-describedby={statusId}
          value={previewLevel}
          onChange={onPreviewLevelChange}
          placeholder={set.level === null ? undefined : String(set.level)}
        />
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
