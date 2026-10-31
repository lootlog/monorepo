import { useState } from "react";
import { t } from "@/i18n/messages";
import { questExperience } from "@/lib/calculators";
import { readNumberInput } from "@/lib/number-input";
import { CalculatorCard } from "./calculator-card";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

const BONUS_LIMIT = { min: 0, max: 1000 };

/** A quest's experience with a blessing and a clan bonus. */
export function QuestExperienceCalculator() {
  const [experience, setExperience] = useState("");
  const [blessing, setBlessing] = useState("0");
  const [clan, setClan] = useState("0");

  const base = readNumberInput(experience, { min: 0, max: 1e12 });
  const blessingPercent = readNumberInput(blessing, BONUS_LIMIT);
  const clanPercent = readNumberInput(clan, BONUS_LIMIT);

  return (
    <CalculatorCard
      id="doswiadczenie-z-questa"
      title={t("calculators.quest.title")}
      description={t("calculators.quest.description")}
      source="community"
      formula={t("calculators.quest.formula")}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CalculatorNumberField
          label={t("calculators.quest.experience")}
          value={experience}
          onChange={setExperience}
          min={0}
          max={1e12}
        />
        <CalculatorNumberField
          label={t("calculators.quest.blessing")}
          value={blessing}
          onChange={setBlessing}
          step={0.1}
          {...BONUS_LIMIT}
        />
        <CalculatorNumberField
          label={t("calculators.quest.clan")}
          value={clan}
          onChange={setClan}
          step={0.1}
          {...BONUS_LIMIT}
        />
      </div>
      <CalculatorResults
        results={[
          {
            label: t("calculators.quest.result"),
            value:
              base === undefined ||
              blessingPercent === undefined ||
              clanPercent === undefined
                ? undefined
                : questExperience({
                    experience: base,
                    blessingPercent,
                    clanPercent,
                  }).toLocaleString("pl-PL"),
          },
        ]}
      />
    </CalculatorCard>
  );
}
