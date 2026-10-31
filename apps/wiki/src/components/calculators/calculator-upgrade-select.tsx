import { useId } from "react";
import { Field, FieldLabel } from "@lootlog/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { t } from "@/i18n/messages";
import {
  isUpgradeLevel,
  UPGRADE_LEVELS,
  type UpgradeLevel,
} from "@/lib/item-upgrade";

const UPGRADE_OPTIONS = UPGRADE_LEVELS.map((level) => ({
  value: String(level),
  label: t("calculators.upgradeLevel", { level }),
}));

/** An item's upgrade, +0 to +5, as one field of a calculator. */
export function CalculatorUpgradeSelect({
  value,
  onChange,
  label = t("calculators.upgrade"),
}: {
  value: UpgradeLevel;
  onChange: (value: UpgradeLevel) => void;
  label?: string;
}) {
  const id = useId();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={String(value)}
        onValueChange={(next) => {
          const level = Number(next);

          if (isUpgradeLevel(level)) onChange(level);
        }}
        items={UPGRADE_OPTIONS}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UPGRADE_OPTIONS.map(({ value: option, label: optionLabel }) => (
            <SelectItem key={option} value={option}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
