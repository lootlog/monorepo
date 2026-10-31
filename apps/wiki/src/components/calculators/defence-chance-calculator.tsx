import { useState } from "react";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  defenceChance,
  MECHANICS_DOCUMENTATION_URL,
  pointsForMaxDefence,
} from "@/lib/calculators";
import { formatPercent } from "@/lib/calculator-format";
import { sumItemStats } from "@/lib/item-stat-totals";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorFromSetButton } from "./calculator-from-set-button";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

/** Evade and block chances against an attacker of a given level. */
export function DefenceChanceCalculator() {
  const { set } = useEquipmentSet();
  const wornItems = useWornItems();
  const [evade, setEvade] = useState("");
  const [block, setBlock] = useState("");
  const [enemyLevel, setEnemyLevel] = useState(String(set.level ?? 300));

  const enemy = readNumberInput(enemyLevel, { min: 1, max: 1000 });
  const evadePoints = readNumberInput(evade, { min: 0, max: 100_000 });
  const blockPoints = readNumberInput(block, { min: 0, max: 100_000 });

  const fillFromSet = () => {
    const totals = sumItemStats(
      [...wornItems.values()].map(({ item }) => item.stat),
    );

    setEvade(String(totals.evade ?? 0));
    setBlock(String(totals.blok ?? 0));

    if (set.level !== null) setEnemyLevel(String(set.level));
  };

  return (
    <CalculatorCard
      id="unik-i-blok"
      title={t("calculators.defence.title")}
      description={t("calculators.defence.description")}
      source="official"
      sourceUrl={MECHANICS_DOCUMENTATION_URL}
      formula={`${t("calculators.defence.formula")} ${t("calculators.defence.fromSetHint")}`}
      actions={
        <CalculatorFromSetButton
          disabled={wornItems.size === 0}
          onClick={fillFromSet}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CalculatorNumberField
          label={t("calculators.defence.evadePoints")}
          value={evade}
          onChange={setEvade}
          min={0}
          max={100_000}
        />
        <CalculatorNumberField
          label={t("calculators.defence.blockPoints")}
          value={block}
          onChange={setBlock}
          min={0}
          max={100_000}
        />
        <CalculatorNumberField
          label={t("calculators.enemyLevel")}
          value={enemyLevel}
          onChange={setEnemyLevel}
          min={1}
          max={1000}
        />
      </div>
      <CalculatorResults
        results={[
          {
            label: t("calculators.defence.evadeChance"),
            value:
              enemy === undefined || evadePoints === undefined
                ? undefined
                : formatPercent(defenceChance(evadePoints, enemy)),
          },
          {
            label: t("calculators.defence.blockChance"),
            value:
              enemy === undefined || blockPoints === undefined
                ? undefined
                : formatPercent(defenceChance(blockPoints, enemy)),
          },
          {
            label: t("calculators.defence.pointsForMax"),
            value:
              enemy === undefined
                ? undefined
                : pointsForMaxDefence(enemy).toLocaleString("pl-PL"),
          },
        ]}
      />
    </CalculatorCard>
  );
}
