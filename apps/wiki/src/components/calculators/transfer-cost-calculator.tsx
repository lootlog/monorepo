import { useState } from "react";
import { t } from "@/i18n/messages";
import {
  characterTransferCost,
  SERVICES_DOCUMENTATION_URL,
} from "@/lib/calculators";
import { formatScales } from "@/lib/calculator-format";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

/** What moving a character to another world costs. */
export function TransferCostCalculator() {
  const [level, setLevel] = useState("");
  const value = readNumberInput(level, { min: 1, max: 1000 });

  return (
    <CalculatorCard
      id="przeniesienie-postaci"
      title={t("calculators.transfer.title")}
      description={t("calculators.transfer.description")}
      source="official"
      sourceUrl={SERVICES_DOCUMENTATION_URL}
      formula={t("calculators.transfer.formula")}
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
            label: t("calculators.transfer.cost"),
            value:
              value === undefined
                ? undefined
                : formatScales(characterTransferCost(value)),
          },
        ]}
      />
    </CalculatorCard>
  );
}
