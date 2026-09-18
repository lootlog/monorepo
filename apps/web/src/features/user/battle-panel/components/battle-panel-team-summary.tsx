import { PlayerTile } from "@/components/tiles/player-tile";
import { PlayerTooltipContent } from "@/components/tiles/player-tooltip-content";
import type { BattleWarrior } from "@/lib/api/battlelog-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { formatBattleTeamNames } from "./battle-panel-battle-presentation";

type BattlePanelTeamSummaryProps = {
  className?: string;
  maxVisibleWarriors?: number;
  team: BattleWarrior[];
  userWarrior?: BattleWarrior;
};

const getVisibleWarriorCount = (teamSize: number, maxVisible: number) =>
  // The overflow counter takes one sprite slot, so it never replaces a single warrior.
  teamSize > maxVisible ? maxVisible - 1 : teamSize;

const renderSprite = (warrior: BattleWarrior, isUserWarrior: boolean) => (
  <div
    key={warrior.id}
    className={cn(
      "relative h-9 w-6 shrink-0 rounded-sm",
      isUserWarrior && "bg-green-500/10 ring-1 ring-inset ring-green-500/40",
    )}
  >
    <PlayerTile
      player={warrior}
      className="absolute left-0 top-0 origin-top-left scale-75"
    />
  </div>
);

export const BattlePanelTeamSummary = ({
  className,
  maxVisibleWarriors = 8,
  team,
  userWarrior,
}: BattlePanelTeamSummaryProps) => {
  const isUserWarrior = (warrior: BattleWarrior) =>
    warrior.originalId === userWarrior?.originalId;

  const [soloWarrior] = team;

  if (team.length === 1 && soloWarrior) {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        {renderSprite(soloWarrior, false)}
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
          <span className="truncate text-[13px] font-medium">
            {soloWarrior.name}
          </span>
          <span className="truncate text-[11px] tabular-nums text-muted-foreground">
            {soloWarrior.lvl}
            {soloWarrior.prof}
          </span>
        </div>
      </div>
    );
  }

  const orderedTeam = [
    ...team.filter(isUserWarrior),
    ...team.filter((warrior) => !isUserWarrior(warrior)),
  ];

  const visibleCount = getVisibleWarriorCount(team.length, maxVisibleWarriors);
  const visibleWarriors = orderedTeam.slice(0, visibleCount);
  const hiddenWarriors = orderedTeam.slice(visibleCount);

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <span className="sr-only">{formatBattleTeamNames(orderedTeam)}</span>
      {visibleWarriors.map((warrior) =>
        renderSprite(warrior, isUserWarrior(warrior)),
      )}
      {hiddenWarriors.length > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                aria-hidden="true"
                className="flex h-9 min-w-6 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/40 px-1 text-[11px] font-semibold tabular-nums text-muted-foreground"
              >
                +{hiddenWarriors.length}
              </span>
            }
          />
          <TooltipContent className="flex flex-col gap-0.5">
            {hiddenWarriors.map((warrior) => (
              <PlayerTooltipContent
                key={warrior.id}
                name={warrior.name}
                lvl={warrior.lvl}
                prof={warrior.prof}
              />
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
