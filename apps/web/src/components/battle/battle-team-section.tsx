import { cn } from "cn";
import { Sword } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TeamDisplay } from "./team-display";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";
import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";

export type BattleTeamSectionProps = {
  team: Warrior[];
  teamNumber: 1 | 2;
  userTeam: number | undefined;
  characterId: string;
  cdnBaseUrl: string;
};

export const BattleTeamSection: FC<BattleTeamSectionProps> = ({
  team,
  teamNumber,
  userTeam,
  characterId,
  cdnBaseUrl,
}) => {
  const { t } = useTranslation();
  const isUserTeam = userTeam === teamNumber;

  return (
    <div className="space-y-3">
      <h3
        className={cn("font-semibold flex items-center justify-center gap-2", {
          [BATTLE_TEXT_COLORS.team.enemy]: !isUserTeam,
          [BATTLE_TEXT_COLORS.team.friendly]: isUserTeam,
        })}
      >
        <Sword className="h-5 w-5" />
        {isUserTeam
          ? t("battleUi.team.userTeam")
          : t("battleUi.team.enemyTeam")}
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
