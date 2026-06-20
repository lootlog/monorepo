import { PlayerTile } from "@/components/battle";
import {
  BattleDamageTags,
  type BattleDamageTagWarrior,
} from "@/features/user/battle-panel/components/battle-damage-tags";
import { cn } from "@lootlog/ui/lib/utils";

type BattlePanelPvpWarriorSummaryData = BattleDamageTagWarrior & {
  icon: string;
  id?: string;
  lvl: number;
  name: string;
  prof: string;
};

type BattlePanelPvpWarriorSummaryProps = {
  className?: string;
  opposingWarrior: BattlePanelPvpWarriorSummaryData;
  warrior: BattlePanelPvpWarriorSummaryData;
};

export function BattlePanelPvpWarriorSummary({
  className,
  opposingWarrior,
  warrior,
}: BattlePanelPvpWarriorSummaryProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <div className="relative h-9 w-6 shrink-0 overflow-visible">
        <PlayerTile
          player={warrior}
          className="absolute left-0 top-0 origin-top-left scale-75"
        />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-xs font-semibold">{warrior.name}</div>
        <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <span className="shrink-0">
            ({warrior.lvl}
            {warrior.prof})
          </span>
          <BattleDamageTags
            team={[warrior]}
            opposingTeam={[opposingWarrior]}
            className="shrink-0 flex-nowrap"
          />
        </div>
      </div>
    </div>
  );
}
