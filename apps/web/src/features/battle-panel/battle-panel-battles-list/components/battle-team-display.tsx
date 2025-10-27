import type { Warrior } from "@/hooks/api/battle-log/use-battles";
import { PlayerTile } from "@/features/guild/components/loots-list/player-tile";
import { cn } from "@/utils/cn";
import type { FC } from "react";

export type TeamDisplayProps = {
  team: Warrior[];
  characterId?: string;
  className?: string;
};

export const TeamDisplay: FC<TeamDisplayProps> = ({
  team,
  characterId,
  className,
}) => {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {team.map((member) => (
        <div
          key={member.id}
          className={cn(
            "flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1 box-border pr-4",
            {
              "border border-green-500": member.originalId === characterId,
            },
          )}
        >
          <PlayerTile player={member} className="scale-90" />
          <div className="text-xs">
            <div
              className={cn("font-semibold", {
                "text-green-500": member.originalId === characterId,
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
