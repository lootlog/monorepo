import { PlayerTile } from "@/features/guild/loots-list/components/loots-list/player-tile";
import {
  BattleDamageTags,
  getBattleDamageTags,
} from "@/features/user/battle-panel/components/battle-damage-tags";
import type { BattleWarrior } from "@/lib/api/battlelog-types";
import { cn } from "@lootlog/ui/lib/utils";
import {
  stopBattleTableAction,
  stopBattleTableKeyboardAction,
} from "./battle-table-events";

type BattleTableTeamCellProps = {
  opposingTeam: BattleWarrior[];
  team: BattleWarrior[];
  userWarrior?: BattleWarrior;
};

export const BattleTableTeamCell = ({
  opposingTeam,
  team,
  userWarrior,
}: BattleTableTeamCellProps) => {
  const hasTags = getBattleDamageTags(team, opposingTeam).length > 0;
  const tagIcons = hasTags ? (
    <BattleDamageTags
      team={team}
      opposingTeam={opposingTeam}
      className="ml-1"
      battleTableAction
      containerProps={{
        onClick: stopBattleTableAction,
        onClickCapture: stopBattleTableAction,
        onKeyDown: stopBattleTableKeyboardAction,
      }}
      badgeProps={{
        onClick: stopBattleTableAction,
        onKeyDown: stopBattleTableKeyboardAction,
      }}
    />
  ) : null;
  const shouldRenderInlineTags = team.length === 1;

  return (
    <div className="flex min-w-0 max-w-[120px] flex-col gap-1 md:min-w-[220px] md:max-w-[280px]">
      {team.map((warrior) => (
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
          {shouldRenderInlineTags && tagIcons}
        </div>
      ))}
      {!shouldRenderInlineTags && tagIcons && (
        <div className="ml-7 flex min-w-0">{tagIcons}</div>
      )}
    </div>
  );
};
