import { TeamDisplay } from "@/features/battle-panel/battle-panel-battles-list/components/battle-team-display";
import { Battle } from "@/hooks/api/battle-log/use-battles";
import { cn } from "@lootlog/ui/lib/utils";
import { Sword } from "lucide-react";
import { FC } from "react";

export type BattleTeamSectionProps = {
  team: Battle["warriors"];
  teamNumber: 1 | 2;
  userTeam: number | undefined;
  characterId: string;
};

export const BattleTeamSection: FC<BattleTeamSectionProps> = ({
  team,
  teamNumber,
  userTeam,
  characterId,
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
        {isUserTeam ? "Twoja drużyna" : "Przeciwnicy"}
      </h3>
      <div className="space-y-2">
        <TeamDisplay
          team={team}
          characterId={characterId}
          className="justify-center"
        />
      </div>
    </div>
  );
};
