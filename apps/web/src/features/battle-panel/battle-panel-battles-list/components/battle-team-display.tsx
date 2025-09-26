import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { PlayerTile } from "@/screens/guild/components/loots-list/player-tile";
import { FC } from "react";

export type TeamDisplayProps = {
  team: Warrior[];
};

export const TeamDisplay: FC<TeamDisplayProps> = ({ team }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {team.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1"
        >
          <PlayerTile player={member} className="scale-90" />
          <div className="text-xs">
            <div
            //   className={`font-medium ${member.isPlayer ? "text-green-500" : ""}`}
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
