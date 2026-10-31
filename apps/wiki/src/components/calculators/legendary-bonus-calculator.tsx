import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Field, FieldLabel } from "@lootlog/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  CALCULABLE_LEGENDARY_BONUSES,
  type CalculableLegendaryBonus,
  LEGENDARY_BONUS_START_VALUES,
  legendaryBonusStrength,
  legendaryBonusValue,
  MECHANICS_DOCUMENTATION_URL,
} from "@/lib/calculators";
import { formatPercent } from "@/lib/calculator-format";
import { upgradedItemLevel, type UpgradeLevel } from "@/lib/item-upgrade";
import { readNumberInput } from "@/lib/number-input";
import { UpgradeSelect } from "@/components/common/upgrade-select";
import { CalculatorCard } from "./calculator-card";
import { CalculatorFromSetButton } from "./calculator-from-set-button";
import { CalculatorNumberField } from "./calculator-number-field";
import { CalculatorResults } from "./calculator-results";

// A set holds at most this many items, so no more can share a bonus.
const MAX_ITEMS = 10;

// What a bonus's value means: most are chances, the rest change damage.
const BONUS_PARAMETER: Record<
  CalculableLegendaryBonus,
  "chance" | "reduction" | "ignore"
> = {
  verycrit: "chance",
  holytouch: "chance",
  curse: "chance",
  glare: "chance",
  cleanse: "chance",
  anguish: "chance",
  critred: "reduction",
  facade: "reduction",
  puncture: "ignore",
};

const BONUS_OPTIONS = CALCULABLE_LEGENDARY_BONUSES.map((bonus) => ({
  value: bonus,
  label: t(`legendaryBonus.${bonus}`),
}));

const isCalculableBonus = (value: string): value is CalculableLegendaryBonus =>
  CALCULABLE_LEGENDARY_BONUSES.some((bonus) => bonus === value);

type BonusItem = { id: string; level: string; upgrade: UpgradeLevel };

const newItem = (level = "", upgrade: UpgradeLevel = 0): BonusItem => ({
  id: crypto.randomUUID(),
  level,
  upgrade,
});

/**
 * A legendary bonus over several items on a character of a given level:
 * each item's remaining strength and the value they add up to.
 */
export function LegendaryBonusCalculator() {
  const bonusFieldId = useId();
  const { set } = useEquipmentSet();
  const wornItems = useWornItems();
  const [bonus, setBonus] = useState<CalculableLegendaryBonus>("verycrit");

  const [characterLevel, setCharacterLevel] = useState(
    String(set.level ?? 300),
  );

  const [items, setItems] = useState<BonusItem[]>(() => [newItem()]);

  const character = readNumberInput(characterLevel, { min: 1, max: 300 });

  const strengths = items.map(({ level, upgrade }) => {
    const itemLevel = readNumberInput(level, { min: 1, max: 300 });

    return itemLevel === undefined || character === undefined
      ? undefined
      : legendaryBonusStrength(
          character,
          upgradedItemLevel(itemLevel, upgrade),
        );
  });

  const knownStrengths = strengths.filter((strength) => strength !== undefined);

  const updateItem = (id: string, change: Partial<BonusItem>) =>
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );

  const fillFromSet = () => {
    const worn = [...wornItems.values()].filter(({ item }) =>
      parseItemStats(item.stat).some(
        ({ key, value }) => key === "legbon" && value === bonus,
      ),
    );

    setItems(
      worn.length > 0
        ? worn.map(({ item, upgrade }) =>
            newItem(String(item.lvl), upgrade.level),
          )
        : [newItem()],
    );

    if (set.level !== null) setCharacterLevel(String(Math.min(set.level, 300)));
  };

  return (
    <CalculatorCard
      id="bonus-legendarny"
      title={t("calculators.legendary.title")}
      description={t("calculators.legendary.description")}
      source="official"
      sourceUrl={MECHANICS_DOCUMENTATION_URL}
      formula={t("calculators.legendary.formula")}
      actions={
        <CalculatorFromSetButton
          disabled={wornItems.size === 0}
          onClick={fillFromSet}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={bonusFieldId}>
            {t("calculators.legendary.bonus")}
          </FieldLabel>
          <Select
            value={bonus}
            onValueChange={(value) => {
              if (value && isCalculableBonus(value)) setBonus(value);
            }}
            items={BONUS_OPTIONS}
          >
            <SelectTrigger id={bonusFieldId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BONUS_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <CalculatorNumberField
          label={t("calculators.characterLevel")}
          value={characterLevel}
          onChange={setCharacterLevel}
          min={1}
          max={300}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-foreground">
          {t("calculators.legendary.items")}
        </legend>
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => {
            const strength = strengths[index];

            return (
              <li
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3"
              >
                <CalculatorNumberField
                  label={t("calculators.legendary.item", { index: index + 1 })}
                  value={item.level}
                  onChange={(level) => updateItem(item.id, { level })}
                  min={1}
                  max={300}
                />
                <UpgradeSelect
                  value={item.upgrade}
                  onChange={(upgrade) => updateItem(item.id, { upgrade })}
                />
                <div className="flex h-9 items-center gap-2">
                  <span className="w-20 text-xs text-muted-foreground tabular-nums">
                    {strength === undefined
                      ? null
                      : t("calculators.legendary.itemStrength", {
                          value: Math.round(strength * 100),
                        })}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("calculators.legendary.removeItem", {
                      index: index + 1,
                    })}
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((current) =>
                        current.filter(({ id }) => id !== item.id),
                      )
                    }
                  >
                    <X />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          icon={<Plus />}
          disabled={items.length >= MAX_ITEMS}
          onClick={() => setItems((current) => [...current, newItem()])}
        >
          {t("calculators.legendary.addItem")}
        </Button>
      </fieldset>

      <CalculatorResults
        results={[
          {
            label: t(
              `calculators.legendary.parameter.${BONUS_PARAMETER[bonus]}`,
            ),
            value:
              knownStrengths.length === 0
                ? undefined
                : formatPercent(
                    legendaryBonusValue(
                      LEGENDARY_BONUS_START_VALUES[bonus],
                      knownStrengths,
                    ),
                  ),
          },
        ]}
      />
    </CalculatorCard>
  );
}
