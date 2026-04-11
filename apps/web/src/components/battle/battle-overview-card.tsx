import type { FC } from "react";
import { Card } from "@lootlog/ui/components/card";
import { BattleOverviewHeader } from "./battle-overview-header";
import { BattleTeamSection } from "./battle-team-section";
import { AnimatedTrophy } from "./animated-trophy";
import { BattleMetadata } from "./battle-metadata";
import type { BattleLabels } from "./battle-labels";
import type { Battle, Warrior } from "@/hooks/api/battle-log/use-battles";
import { useTranslation } from "react-i18next";

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
  labels?: Partial<BattleLabels>;
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
  labels = {},
  showHeader = true,
}) => {
  const { t } = useTranslation();
  const defaultLabels: BattleLabels = {
    header: {
      title: t("battleUi.overviewHeader.title"),
      copyLink: t("battleUi.overviewHeader.copyLink"),
      hide: t("battleUi.overviewHeader.hide"),
      share: t("battleUi.overviewHeader.share"),
      delete: t("battleUi.overviewHeader.delete"),
      deleteConfirmTitle: t("battleUi.overviewHeader.deleteConfirmTitle"),
      deleteConfirmDescription: t(
        "battleUi.overviewHeader.deleteConfirmDescription",
      ),
      cancel: t("battleUi.overviewHeader.cancel"),
      deleteBattle: t("battleUi.overviewHeader.deleteBattle"),
    },
    teams: {
      userTeam: t("battleUi.team.userTeam"),
      enemyTeam: t("battleUi.team.enemyTeam"),
    },
    metadata: {
      startTime: t("battleUi.metadata.startTime"),
      duration: t("battleUi.metadata.duration"),
      battleType: t("battleUi.metadata.battleType"),
      public: t("battleUi.metadata.public"),
      private: t("battleUi.metadata.private"),
      publicTooltip: t("battleUi.metadata.publicTooltip"),
      privateTooltip: t("battleUi.metadata.privateTooltip"),
    },
  };
  const mergedLabels = {
    header: { ...defaultLabels.header, ...(labels.header ?? {}) },
    teams: { ...defaultLabels.teams, ...(labels.teams ?? {}) },
    metadata: { ...defaultLabels.metadata, ...(labels.metadata ?? {}) },
  };

  const attackingTeam = battle.warriors.filter((w: Warrior) => w.team === 1);
  const defendingTeam = battle.warriors.filter((w: Warrior) => w.team === 2);

  const userTeam = battle.warriors.find(
    (w: Warrior) =>
      w.originalId === (currentUserCharacterId || battle.characterId),
  );

  const leftTeam = userTeam?.team === 1 ? attackingTeam : defendingTeam;
  const rightTeam = userTeam?.team === 1 ? defendingTeam : attackingTeam;
  const leftTeamNumber = userTeam?.team === 1 ? 1 : 2;
  const rightTeamNumber = userTeam?.team === 1 ? 2 : 1;

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
          labels={mergedLabels.header}
        />
      )}
      <div className="bg-gradient-to-r from-green-400/10 via-transparent to-red-400/10 text-white relative">
        <div className="p-4 pt-12 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BattleTeamSection
              team={leftTeam}
              teamNumber={leftTeamNumber}
              userTeam={userTeam?.team}
              characterId={currentUserCharacterId || battle.characterId}
              cdnBaseUrl={cdnBaseUrl}
              teamLabels={mergedLabels.teams}
            />
            <div className="grid grid-cols-3 items-center justify-items-center">
              <div>
                <AnimatedTrophy
                  show={
                    battle.winningTeam === leftTeamNumber && !battle.hasFlee
                  }
                  isUserTeamWinner={userTeam?.team === leftTeamNumber}
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
                  isUserTeamWinner={userTeam?.team === rightTeamNumber}
                />
              </div>
            </div>

            <BattleTeamSection
              team={rightTeam}
              teamNumber={rightTeamNumber}
              userTeam={userTeam?.team}
              characterId={currentUserCharacterId || battle.characterId}
              cdnBaseUrl={cdnBaseUrl}
              teamLabels={mergedLabels.teams}
            />
          </div>
        </div>
        <BattleMetadata battle={battle} labels={mergedLabels.metadata} />
      </div>
    </Card>
  );
};
