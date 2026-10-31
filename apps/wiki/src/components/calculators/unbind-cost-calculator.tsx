import { useId, useState } from "react";
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
  UNBIND_RARITIES,
  type UnbindRarity,
  unbindCost,
} from "@/lib/calculators";
import { formatScales } from "@/lib/calculator-format";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

const RARITY_OPTIONS = UNBIND_RARITIES.map((rarity) => ({
  value: rarity,
  label: t(`itemRarity.${rarity}`),
}));

const isUnbindRarity = (value: string): value is UnbindRarity =>
  UNBIND_RARITIES.some((rarity) => rarity === value);

/** The dragon scales unbinding an item costs, as players found it. */
export function UnbindCostCalculator() {
  const rarityFieldId = useId();
  const [level, setLevel] = useState("");
  const [rarity, setRarity] = useState<UnbindRarity>("HEROIC");
  const value = readNumberInput(level, { min: 1, max: 300 });

  return (
    <CalculatorCard
      id="odwiazanie"
      title={t("calculators.unbind.title")}
      description={t("calculators.unbind.description")}
      source="community"
      formula={t("calculators.unbind.formula")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CalculatorNumberField
          label={t("calculators.itemLevel")}
          value={level}
          onChange={setLevel}
          min={1}
          max={300}
        />
        <Field>
          <FieldLabel htmlFor={rarityFieldId}>
            {t("calculators.unbind.rarity")}
          </FieldLabel>
          <Select
            value={rarity}
            onValueChange={(next) => {
              if (next && isUnbindRarity(next)) setRarity(next);
            }}
            items={RARITY_OPTIONS}
          >
            <SelectTrigger id={rarityFieldId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RARITY_OPTIONS.map(({ value: option, label }) => (
                <SelectItem key={option} value={option}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <CalculatorResults
        results={[
          {
            label: t("calculators.unbind.cost"),
            value:
              value === undefined
                ? undefined
                : formatScales(unbindCost(value, rarity)),
          },
        ]}
      />
    </CalculatorCard>
  );
}
