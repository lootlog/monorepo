import { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { cn } from "cn";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import {
  isCalculableLegendaryBonus,
  LEGENDARY_BONUS_PARAMETERS,
  wornLegendaryBonuses,
} from "@/lib/calculators";
import { formatPercent } from "@/lib/calculator-format";
import { LEGENDARY_BONUS_NAMES } from "@lootlog/ui/components/item-stat-utils";
import { skillPlanLevel } from "@/lib/skills/skill-tree";

export function EquipmentLegendaryBonuses() {
  const { set } = useEquipmentSet();
  const { wornItems } = useSetSummary();

  const bonuses = wornLegendaryBonuses(
    [...wornItems.values()].map(({ item }) => item.stat),
    skillPlanLevel(set.level),
  ).flatMap((bonus) => {
    const name = LEGENDARY_BONUS_NAMES.find((known) => known === bonus.name);

    return name ? [{ ...bonus, name }] : [];
  });

  if (bonuses.length === 0) return null;

  return (
    <section
      aria-labelledby="set-stats-legendary"
      className="flex flex-col gap-1.5"
    >
      <h3
        id="set-stats-legendary"
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {t("setStats.sections.legendary")}
      </h3>
      <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-[0.8125rem]">
        {bonuses.map(({ name, items, value, isWeakened }) => (
          <div key={name} className="flex flex-col">
            <dt
              className={cn(
                "font-semibold",
                LOOT_RARITY_TEXT_CLASS[DisplayItemRarity.LEGENDARY],
              )}
            >
              {t(`legendaryBonus.${name}`)}
              {items > 1 ? (
                <span className="font-medium tabular-nums">
                  {" "}
                  {t("setStats.legendaryItems", { count: items })}
                </span>
              ) : null}
            </dt>
            <dd className="text-xs text-muted-foreground">
              {[
                isCalculableLegendaryBonus(name) && value !== undefined
                  ? t("setStats.legendaryValue", {
                      parameter: t(
                        `calculators.legendary.parameter.${LEGENDARY_BONUS_PARAMETERS[name]}`,
                      ),
                      value: formatPercent(value),
                    })
                  : t("setStats.legendaryNoValue"),
                isWeakened ? t("setStats.legendaryWeakened") : undefined,
              ]
                .filter((part) => part !== undefined)
                .join(" · ")}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
