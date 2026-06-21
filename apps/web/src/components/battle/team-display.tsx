import { cn } from "@lootlog/ui/lib/utils";
import type { FC } from "react";
import { PlayerTile } from "./player-tile";
import {
  BATTLE_SURFACE_COLORS,
  BATTLE_TEXT_COLORS,
} from "./utils/battle-color-palette";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";

export type TeamDisplayProps = {
  team: Warrior[];
  characterId?: string;
  className?: string;
  cdnBaseUrl: string;
};

export const TeamDisplay: FC<TeamDisplayProps> = ({
  team,
  characterId,
  className,
  cdnBaseUrl,
}) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {team.map((member) => (
        <div
          key={member.id}
          className={cn(
            "flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1 box-border pr-4",
            member.originalId === characterId && "border",
            member.originalId === characterId &&
              BATTLE_SURFACE_COLORS.team.currentCharacterBorder,
          )}
        >
          <PlayerTile
            player={member}
            className="scale-90"
            cdnBaseUrl={cdnBaseUrl}
          />
          <div className="text-xs">
            <div
              className={cn("font-semibold", {
                [BATTLE_TEXT_COLORS.team.friendly]:
                  member.originalId === characterId,
              })}
            >
              {member.name}
            </div>
            <div className="text-muted-foreground">
              {member.lvl}
              {member.prof}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
