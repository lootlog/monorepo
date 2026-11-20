import { useState } from "react";
import { t } from "@/i18n/messages";
import {
  HOLY_TOUCH_TURNS,
  holyTouchHeal,
  MECHANICS_DOCUMENTATION_URL,
} from "@/lib/calculators";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CALCULATOR_FIELDS } from "./calculator-fields";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";
import { formatNumber } from "@lootlog/domain/locale";

/** Dotyk anioła's healing for a character's health. */
export function HolyTouchCalculator() {
  const [health, setHealth] = useState("");
  const value = readNumberInput(health, { min: 1, max: 10_000_000 });
  const heal = value === undefined ? undefined : holyTouchHeal(value);

  return (
    <CalculatorCard
      id="dotyk-aniola"
      title={t("calculators.holyTouch.title")}
      description={t("calculators.holyTouch.description")}
      source="official"
      sourceUrl={MECHANICS_DOCUMENTATION_URL}
      formula={t("calculators.holyTouch.formula")}
      results={
        <CalculatorResults
          results={[
            {
              label: t("calculators.holyTouch.perTurn"),
              value: heal === undefined ? undefined : formatNumber(heal),
            },
            {
              label: t("calculators.holyTouch.total"),
              value:
                heal === undefined
                  ? undefined
                  : formatNumber(heal * HOLY_TOUCH_TURNS),
            },
          ]}
        />
      }
    >
      <div className={CALCULATOR_FIELDS}>
        <CalculatorNumberField
          label={t("calculators.holyTouch.health")}
          value={health}
          onChange={setHealth}
          min={1}
          max={10_000_000}
        />
      </div>
    </CalculatorCard>
  );
}
