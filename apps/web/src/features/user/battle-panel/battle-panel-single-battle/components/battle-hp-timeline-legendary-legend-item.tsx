import { legendaryBonusIconByType } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-icons";
import type { LegendaryBonusMarkerDefinition } from "./battle-hp-timeline-legendary-markers";

type BattleHpTimelineLegendaryLegendItemProps = {
  item: LegendaryBonusMarkerDefinition;
  label: string;
};

export function BattleHpTimelineLegendaryLegendItem({
  item,
  label,
}: BattleHpTimelineLegendaryLegendItemProps) {
  const Icon = legendaryBonusIconByType[item.type];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-foreground"
      title={label}
    >
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center rounded-full border bg-background"
        style={{ borderColor: item.color }}
      >
        <Icon className="size-3.5" color={item.color} strokeWidth={2.4} />
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
