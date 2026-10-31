import { useState } from "react";
import { t } from "@/i18n/messages";
import {
  ANGUISH_TURNS,
  anguishDamage,
  MECHANICS_DOCUMENTATION_URL,
} from "@/lib/calculators";
import type { UpgradeLevel } from "@/lib/item-upgrade";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";
import { CalculatorUpgradeSelect } from "./calculator-upgrade-select";

const ATTRIBUTE_LIMIT = { min: 0, max: 100_000 };

/** Krwawa udręka's bleeding from an item and the character's attributes. */
export function AnguishCalculator() {
  const [itemLevel, setItemLevel] = useState("");
  const [upgrade, setUpgrade] = useState<UpgradeLevel>(0);
  const [strength, setStrength] = useState("");
  const [intellect, setIntellect] = useState("");
  const [agility, setAgility] = useState("");

  const level = readNumberInput(itemLevel, { min: 1, max: 300 });
  const str = readNumberInput(strength, ATTRIBUTE_LIMIT);
  const int = readNumberInput(intellect, ATTRIBUTE_LIMIT);
  const agi = readNumberInput(agility, ATTRIBUTE_LIMIT);

  const damage =
    level === undefined ||
    str === undefined ||
    int === undefined ||
    agi === undefined
      ? undefined
      : anguishDamage({
          itemLevel: level,
          upgrade,
          strength: str,
          intellect: int,
          agility: agi,
        });

  return (
    <CalculatorCard
      id="krwawa-udreka"
      title={t("calculators.anguish.title")}
      description={t("calculators.anguish.description")}
      source="official"
      sourceUrl={MECHANICS_DOCUMENTATION_URL}
      formula={t("calculators.anguish.formula")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <CalculatorNumberField
          label={t("calculators.itemLevel")}
          value={itemLevel}
          onChange={setItemLevel}
          min={1}
          max={300}
        />
        <CalculatorUpgradeSelect value={upgrade} onChange={setUpgrade} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <CalculatorNumberField
          label={t("calculators.anguish.strength")}
          value={strength}
          onChange={setStrength}
          {...ATTRIBUTE_LIMIT}
        />
        <CalculatorNumberField
          label={t("calculators.anguish.intellect")}
          value={intellect}
          onChange={setIntellect}
          {...ATTRIBUTE_LIMIT}
        />
        <CalculatorNumberField
          label={t("calculators.anguish.agility")}
          value={agility}
          onChange={setAgility}
          {...ATTRIBUTE_LIMIT}
        />
      </div>
      <CalculatorResults
        results={[
          {
            label: t("calculators.anguish.perTurn"),
            value: damage?.toLocaleString("pl-PL"),
          },
          {
            label: t("calculators.anguish.total"),
            value:
              damage === undefined
                ? undefined
                : (damage * ANGUISH_TURNS).toLocaleString("pl-PL"),
          },
        ]}
      />
    </CalculatorCard>
  );
}
