import { useState } from "react";
import { t } from "@/i18n/messages";
import {
  attackSpeedFromAgility,
  evadeFromAgility,
  MECHANICS_DOCUMENTATION_URL,
} from "@/lib/calculators";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

/** The attack speed and evade a character's agility alone gives. */
export function AttackSpeedCalculator() {
  const [agility, setAgility] = useState("");
  const value = readNumberInput(agility, { min: 0, max: 100_000 });

  return (
    <CalculatorCard
      id="szybkosc-ataku"
      title={t("calculators.attackSpeed.title")}
      description={t("calculators.attackSpeed.description")}
      source="official"
      sourceUrl={MECHANICS_DOCUMENTATION_URL}
      formula={t("calculators.attackSpeed.formula")}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CalculatorNumberField
          label={t("calculators.attackSpeed.agility")}
          value={agility}
          onChange={setAgility}
          min={0}
          max={100_000}
        />
      </div>
      <CalculatorResults
        results={[
          {
            label: t("calculators.attackSpeed.attackSpeed"),
            value:
              value === undefined
                ? undefined
                : attackSpeedFromAgility(value).toLocaleString("pl-PL", {
                    maximumFractionDigits: 3,
                  }),
          },
          {
            label: t("calculators.attackSpeed.evade"),
            value:
              value === undefined
                ? undefined
                : evadeFromAgility(value).toLocaleString("pl-PL"),
          },
        ]}
      />
    </CalculatorCard>
  );
}
