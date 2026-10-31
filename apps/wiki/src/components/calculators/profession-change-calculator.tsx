import { useState } from "react";
import { t } from "@/i18n/messages";
import { professionChangeCost } from "@/lib/calculators";
import { formatScales } from "@/lib/calculator-format";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

/** The dragon scales a profession change costs, as players found it. */
export function ProfessionChangeCalculator() {
  const [level, setLevel] = useState("");
  const value = readNumberInput(level, { min: 1, max: 1000 });

  return (
    <CalculatorCard
      id="zmiana-profesji"
      title={t("calculators.profession.title")}
      description={t("calculators.profession.description")}
      source="community"
      formula={t("calculators.profession.formula")}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CalculatorNumberField
          label={t("calculators.characterLevel")}
          value={level}
          onChange={setLevel}
          min={1}
          max={1000}
        />
      </div>
      <CalculatorResults
        results={[
          {
            label: t("calculators.profession.cost"),
            value:
              value === undefined
                ? undefined
                : formatScales(professionChangeCost(value)),
          },
        ]}
      />
    </CalculatorCard>
  );
}
