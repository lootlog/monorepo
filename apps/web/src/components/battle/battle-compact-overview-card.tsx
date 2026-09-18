import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { cn } from "cn";
import { Flag, Skull, Trophy, type LucideIcon } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { Battle } from "@/lib/api/battlelog-types";
import {
  BATTLE_BADGE_COLORS,
  BATTLE_SURFACE_COLORS,
} from "./utils/battle-color-palette";
import { BattleCompactTeam } from "./battle-compact-team";
import { BattleMetadata } from "./battle-metadata";
import { getBattleTeamPresentation } from "./utils/battle-team-presentation";

export type BattleCompactOverviewCardProps = {
  battle: Battle;
  cdnBaseUrl: string;
  currentUserCharacterId?: string;
};

type BattleWinnerResult = "flee" | "won";

type BattleTeamResult = BattleWinnerResult | "lost";

const RESULT_ICON_BY_TYPE: Record<BattleTeamResult, LucideIcon> = {
  flee: Flag,
  lost: Skull,
  won: Trophy,
};

const getWinnerResult = (battle: Battle): BattleWinnerResult =>
  battle.hasFlee ? "flee" : "won";

export const BattleCompactOverviewCard: FC<BattleCompactOverviewCardProps> = ({
  battle,
  cdnBaseUrl,
  currentUserCharacterId,
}) => {
  const { t } = useTranslation();

  const { characterId, leftTeam, rightTeam, leftTeamNumber, rightTeamNumber } =
    getBattleTeamPresentation(battle, currentUserCharacterId);

  const winnerResult = getWinnerResult(battle);
  const isGroup = leftTeam.length > 1 || rightTeam.length > 1;

  const dividerLineClassName = cn(
    "h-px flex-1 bg-border/70",
    isGroup ? "@5xl:h-auto @5xl:w-px" : "@md:h-auto @md:w-px",
  );

  const getTeamResult = (teamNumber: number) => {
    if (battle.winningTeam === null || battle.winningTeam === undefined) {
      return null;
    }

    if (battle.winningTeam === teamNumber) {
      return winnerResult;
    }

    return battle.hasFlee ? null : "lost";
  };

  const renderTeamResult = (teamNumber: number) => {
    const result = getTeamResult(teamNumber);

    if (!result) {
      return null;
    }

    const ResultIcon = RESULT_ICON_BY_TYPE[result];

    return (
      <span
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-[11px] font-semibold leading-none",
          BATTLE_BADGE_COLORS.result[result],
        )}
      >
        <ResultIcon className="size-3" aria-hidden />
        {t(`battlePanel.list.results.${result}`)}
      </span>
    );
  };

  return (
    <Card className="w-full gap-0 overflow-hidden border-border bg-card p-0">
      <div
        className={cn(
          BATTLE_SURFACE_COLORS.overview.teamGradient,
          "grid grid-cols-1 gap-3 px-3 py-3",
          // Teams sit side by side once their column is wide enough: a duel needs little room,
          // a group needs space for several members per row.
          isGroup
            ? "@5xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @5xl:gap-4 @5xl:px-4"
            : "@md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @md:gap-4 @md:px-4",
        )}
      >
        <BattleCompactTeam
          cdnBaseUrl={cdnBaseUrl}
          characterId={characterId}
          isUserTeam
          label={t("battleUi.team.userTeam")}
          opposingTeam={rightTeam}
          result={renderTeamResult(leftTeamNumber)}
          team={leftTeam}
        />

        <div
          className={cn(
            "flex items-center gap-3",
            isGroup
              ? "@5xl:flex-col @5xl:self-stretch"
              : "@md:flex-col @md:self-stretch",
          )}
          aria-hidden
        >
          <span className={dividerLineClassName} />
          <span className="rounded-full border border-border/80 bg-background/60 px-2.5 py-1.5 text-[11px] font-bold leading-none tracking-wider text-muted-foreground">
            {t("battleUi.overview.vs")}
          </span>
          <span className={dividerLineClassName} />
        </div>

        <BattleCompactTeam
          align={isGroup ? "start" : "end"}
          cdnBaseUrl={cdnBaseUrl}
          characterId={characterId}
          isUserTeam={false}
          label={t("battleUi.team.enemyTeam")}
          opposingTeam={leftTeam}
          result={renderTeamResult(rightTeamNumber)}
          team={rightTeam}
        />
      </div>

      <BattleMetadata
        battle={battle}
        className="border-t border-border/60 bg-background/30 px-3 py-2"
      />
    </Card>
  );
};
