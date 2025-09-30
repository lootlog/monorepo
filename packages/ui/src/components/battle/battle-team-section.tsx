import { cn } from "../../lib/utils.js";
import { Sword } from "lucide-react";
import { FC } from "react";
import { TeamDisplay } from "./team-display.js";
import type { SharedWarrior } from "../../types/battle.js";

export type BattleTeamSectionProps = {
  team: SharedWarrior[];
  teamNumber: 1 | 2;
  userTeam: number | undefined;
  characterId: string;
  cdnBaseUrl: string;
  teamLabels?: {
    userTeam: string;
    enemyTeam: string;
  };
};

export const BattleTeamSection: FC<BattleTeamSectionProps> = ({
  team,
  teamNumber,
  userTeam,
  characterId,
  cdnBaseUrl,
  teamLabels = {
    userTeam: "Your Team",
    enemyTeam: "Enemies",
  },
}) => {
  const isUserTeam = userTeam === teamNumber;

  return (
    <div className="space-y-3">
      <h3
        className={cn("font-semibold flex items-center justify-center gap-2", {
          "text-destructive": !isUserTeam,
          "text-green-500": isUserTeam,
        })}
      >
        <Sword className="h-5 w-5" />
        {isUserTeam ? teamLabels.userTeam : teamLabels.enemyTeam}
      </h3>
      <div className="space-y-2">
        <TeamDisplay
          team={team}
          characterId={characterId}
          className="justify-center"
          cdnBaseUrl={cdnBaseUrl}
        />
      </div>
    </div>
  );
};