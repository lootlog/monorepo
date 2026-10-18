import { BattleResultStatus } from "@/features/user/battle-panel/components/battle-result-status";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { Battle } from "@/lib/api/battlelog-types";
import { BattleCompactTeam } from "./battle-compact-team";
import { getBattleTeamPresentation } from "./utils/battle-team-presentation";

export type BattleTeamsOverviewProps = {
  battle: Battle;
  cdnBaseUrl: string;
};

const getWinnerResult = (battle: Battle) =>
  battle.hasFlee ? ("flee" as const) : ("won" as const);

/**
 * Both teams side by side, one rule between them, each with its result. A duel needs little
 * room, so it splits sooner than a group, which needs space for several members per row.
 */
export const BattleTeamsOverview: FC<BattleTeamsOverviewProps> = ({
  battle,
  cdnBaseUrl,
}) => {
  const { t } = useTranslation();

  const { characterId, leftTeam, rightTeam, leftTeamNumber, rightTeamNumber } =
    getBattleTeamPresentation(battle);

  const isGroup = leftTeam.length > 1 || rightTeam.length > 1;

  const getTeamResult = (teamNumber: number) => {
    if (battle.winningTeam === null || battle.winningTeam === undefined) {
      return null;
    }

    if (battle.winningTeam === teamNumber) {
      return getWinnerResult(battle);
    }

    return battle.hasFlee ? null : "lost";
  };

  const splitClassName = isGroup ? "@3xl:grid-cols-2" : "@md:grid-cols-2";

  return (
    <div
      data-list-tile
      className={cn(
        "grid grid-cols-1 border-b border-sidebar-border",
        splitClassName,
      )}
    >
      <BattleCompactTeam
        cdnBaseUrl={cdnBaseUrl}
        characterId={characterId}
        isUserTeam
        label={t("battleUi.team.userTeam")}
        opposingTeam={rightTeam}
        result={
          <BattleResultStatus
            result={getTeamResult(leftTeamNumber)}
            showLabel
          />
        }
        team={leftTeam}
      />
      <BattleCompactTeam
        align={isGroup ? "start" : "end"}
        cdnBaseUrl={cdnBaseUrl}
        characterId={characterId}
        isUserTeam={false}
        label={t("battleUi.team.enemyTeam")}
        opposingTeam={leftTeam}
        result={
          <BattleResultStatus
            result={getTeamResult(rightTeamNumber)}
            showLabel
          />
        }
        team={rightTeam}
        className={cn(
          "border-t border-sidebar-border",
          isGroup
            ? "@3xl:border-t-0 @3xl:border-l"
            : "@md:border-t-0 @md:border-l",
        )}
      />
    </div>
  );
};
