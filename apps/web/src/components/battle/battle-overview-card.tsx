import type { FC } from "react";
import { Card } from "@lootlog/ui/components/card";
import { BattleOverviewHeader } from "./battle-overview-header";
import { BattleTeamSection } from "./battle-team-section";
import { AnimatedTrophy } from "./animated-trophy";
import { BattleMetadata } from "./battle-metadata";
import type { Battle } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import { BATTLE_SURFACE_COLORS } from "./utils/battle-color-palette";
import { getBattleTeamPresentation } from "./utils/battle-team-presentation";

export type BattleOverviewCardProps = {
  battle: Battle;
  currentUserCharacterId?: string;
  onShare?: (battleId: string) => void;
  onCopyLink?: (battleId: string) => void;
  onUnshare?: (battleId: string) => void;
  onDelete?: (battleId: string) => void;
  isSharePending?: boolean;
  showActions?: boolean;
  cdnBaseUrl: string;
  showHeader?: boolean;
};

export const BattleOverviewCard: FC<BattleOverviewCardProps> = ({
  battle,
  currentUserCharacterId,
  onShare,
  onCopyLink,
  onUnshare,
  onDelete,
  isSharePending = false,
  showActions = true,
  cdnBaseUrl,
  showHeader = true,
}) => {
  const { t } = useTranslation();
  const {
    characterId,
    leftTeam,
    rightTeam,
    leftTeamNumber,
    rightTeamNumber,
    userWarrior,
  } = getBattleTeamPresentation(battle, currentUserCharacterId);

  const handleShareClick = () => {
    onShare?.(battle.id);
  };

  const handleCopyClick = () => {
    onCopyLink?.(battle.id);
  };

  const handleUnshareClick = () => {
    onUnshare?.(battle.id);
  };

  const handleDeleteClick = () => {
    onDelete?.(battle.id);
  };

  return (
    <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden gap-0 p-0 w-full">
      {showHeader && (
        <BattleOverviewHeader
          isPublic={battle.public}
          isPending={isSharePending}
          onShareClick={handleShareClick}
          onCopyClick={handleCopyClick}
          onUnshareClick={handleUnshareClick}
          onDeleteClick={handleDeleteClick}
          showActions={showActions}
        />
      )}
      <div
        className={cn(
          BATTLE_SURFACE_COLORS.overview.teamGradient,
          "text-white relative",
        )}
      >
        <div className="p-4 pt-12 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BattleTeamSection
              team={leftTeam}
              teamNumber={leftTeamNumber}
              userTeam={userWarrior?.team}
              characterId={characterId}
              cdnBaseUrl={cdnBaseUrl}
            />
            <div className="grid grid-cols-3 items-center justify-items-center">
              <div>
                <AnimatedTrophy
                  show={
                    battle.winningTeam === leftTeamNumber && !battle.hasFlee
                  }
                  isUserTeamWinner={userWarrior?.team === leftTeamNumber}
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {t("battleUi.overview.vs")}
                </div>
              </div>
              <div>
                <AnimatedTrophy
                  show={
                    battle.winningTeam === rightTeamNumber && !battle.hasFlee
                  }
                  isUserTeamWinner={userWarrior?.team === rightTeamNumber}
                />
              </div>
            </div>

            <BattleTeamSection
              team={rightTeam}
              teamNumber={rightTeamNumber}
              userTeam={userWarrior?.team}
              characterId={characterId}
              cdnBaseUrl={cdnBaseUrl}
            />
          </div>
        </div>
        <BattleMetadata battle={battle} />
      </div>
    </Card>
  );
};
