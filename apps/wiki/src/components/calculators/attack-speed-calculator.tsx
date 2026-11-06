import { useState } from "react";
import { attackSpeedFromAgility } from "@lootlog/domain/attack-speed";
import { t } from "@/i18n/messages";
import {
  evadeFromAgility,
  MECHANICS_DOCUMENTATION_URL,
} from "@/lib/calculators";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CALCULATOR_FIELDS } from "./calculator-fields";
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
      results={
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
      }
    >
      <div className={CALCULATOR_FIELDS}>
        <CalculatorNumberField
          label={t("calculators.attackSpeed.agility")}
          value={agility}
          onChange={setAgility}
          min={0}
          max={100_000}
        />
      </div>
    </CalculatorCard>
  );
}
