import { cn } from "@lootlog/ui/lib/utils";
import { Sword } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TeamDisplay } from "./team-display";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";

export type BattleTeamSectionProps = {
  team: Warrior[];
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
  teamLabels,
}) => {
  const { t } = useTranslation();
  const isUserTeam = userTeam === teamNumber;
  const resolvedTeamLabels = teamLabels ?? {
    userTeam: t("battleUi.team.userTeam"),
    enemyTeam: t("battleUi.team.enemyTeam"),
  };

  return (
    <div className="space-y-3">
      <h3
        className={cn("font-semibold flex items-center justify-center gap-2", {
          "text-destructive": !isUserTeam,
          "text-green-500": isUserTeam,
        })}
      >
        <Sword className="h-5 w-5" />
        {isUserTeam
          ? resolvedTeamLabels.userTeam
          : resolvedTeamLabels.enemyTeam}
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
