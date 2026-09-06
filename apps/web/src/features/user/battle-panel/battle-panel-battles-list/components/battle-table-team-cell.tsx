import { PlayerTile } from "@/components/tiles/player-tile";
import { PlayerSpriteTile } from "@/components/tiles/player-sprite-tile";
import { PlayerTooltipContent } from "@/components/tiles/player-tooltip-content";
import type { BattleWarrior } from "@/lib/api/battlelog-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import {
  stopBattleTableAction,
  stopBattleTableKeyboardAction,
} from "./battle-table-events";

type BattleTableTeamCellProps = {
  team: BattleWarrior[];
  userWarrior?: BattleWarrior;
};

export const BattleTableTeamCell = ({
  team,
  userWarrior,
}: BattleTableTeamCellProps) => {
  const isGroupTeam = team.length > 1;

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-[120px] md:min-w-[220px] md:max-w-[280px]",
        isGroupTeam ? "flex-wrap items-center gap-1" : "flex-col gap-1",
      )}
    >
      {team.map((warrior) =>
        isGroupTeam ? (
          <Tooltip key={warrior.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`${warrior.name} (${warrior.lvl}${warrior.prof})`}
                  className={cn(
                    "relative h-9 w-6 shrink-0 rounded-sm outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                    warrior.originalId === userWarrior?.originalId &&
                      "bg-green-500/10 ring-1 ring-inset ring-green-500/40",
                  )}
                  onClick={stopBattleTableAction}
                  onKeyDown={stopBattleTableKeyboardAction}
                >
                  <PlayerSpriteTile
                    icon={warrior.icon}
                    className="absolute left-0 top-0 origin-top-left scale-75"
                  />
                </button>
              }
            />
            <TooltipContent>
              <PlayerTooltipContent
                name={warrior.name}
                lvl={warrior.lvl}
                prof={warrior.prof}
              />
            </TooltipContent>
          </Tooltip>
        ) : (
          <div key={warrior.id} className="flex min-w-0 items-center gap-1.5">
            <PlayerTile player={warrior} className="origin-center scale-75" />
            <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
              <span
                className={cn("min-w-0 truncate text-xs font-medium", {
                  "text-green-500":
                    warrior.originalId === userWarrior?.originalId,
                })}
              >
                {warrior.name}
              </span>
              <span className="truncate text-[11px] font-normal text-muted-foreground">
                ({warrior.lvl}
                {warrior.prof})
              </span>
            </div>
          </div>
        ),
      )}
    </div>
  );
};
