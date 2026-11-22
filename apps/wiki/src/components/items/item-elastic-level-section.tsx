import { useId } from "react";
import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
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
  level: number;
  previewLevel: number | undefined;
  onPreviewLevelChange: (level: number | undefined) => void;
};

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
