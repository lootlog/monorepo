import { battleHpTimelineEventIconByKey } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-icons";
import type { BattleHpTimelineEventLegendItem } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legend-items";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";

type BattleHpTimelineLegendEventRowProps = {
  item: BattleHpTimelineEventLegendItem;
  label: string;
};

export function BattleHpTimelineLegendEventRow({
  item,
  label,
}: BattleHpTimelineLegendEventRowProps) {
  const Icon = battleHpTimelineEventIconByKey[item.key];

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full border bg-background"
        style={{ borderColor: item.color }}
      >
        <Icon className="size-3.5" color={item.color} strokeWidth={2.4} />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          item.count === 0 && "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <Badge variant="outline" className="min-w-8 justify-center rounded-sm">
        {item.count}
      </Badge>
    </div>
  );
}
