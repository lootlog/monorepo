import { cn } from "cn";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import {
  SET_STAT_SECTIONS,
  type SetStatDefinition,
  setStatValue,
} from "@/lib/item-stat-totals";
import { EquipmentKeyStat } from "./equipment-key-stat";

// The stats players compare first in a group fight.
const KEY_STATS = ["sa", "hp", "ac", "evade", "crit"];

const stats = SET_STAT_SECTIONS.flatMap(
  (section): readonly SetStatDefinition[] => section.stats,
).filter(({ id }) => KEY_STATS.includes(id));

/** A few of the set's stats in a row, with the change the last edit made. */
export function EquipmentKeyStats({ className }: { className?: string }) {
  const { totals, isLoaded } = useSetSummary();

  return (
    <dl className={cn("flex shrink-0 items-center gap-5", className)}>
      {stats.map((stat) => (
        <EquipmentKeyStat
          key={stat.id}
          label={t(`setStats.stats.${stat.id}`)}
          unit={"unit" in stat ? stat.unit : ""}
          total={setStatValue(totals, stat) ?? 0}
          isLoaded={isLoaded}
        />
      ))}
    </dl>
  );
}
