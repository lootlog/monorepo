import { cn } from "../../lib/utils";
import { FC } from "react";
import { BattleOverviewHeader } from "./battle-overview-header";
import { BattleTeamSection } from "./battle-team-section";
import { AnimatedTrophy } from "./animated-trophy";
import { BattleMetadata } from "./battle-metadata";
import type { SharedBattleData } from "../../types/battle";
import { DEFAULT_BATTLE_LABELS, type BattleLabels } from "./battle-labels";

export type BattleOverviewCardProps = {
  battle: SharedBattleData & {
    createdAt: string;
    public: boolean;
  };
  currentUserCharacterId?: string;
  onShare?: (battleId: string) => void;
  onCopyLink?: (battleId: string) => void;
  onUnshare?: (battleId: string) => void;
  onDelete?: (battleId: string) => void;
  isSharePending?: boolean;
  showActions?: boolean;
  cdnBaseUrl: string;
  labels?: Partial<BattleLabels>;
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
  labels = DEFAULT_BATTLE_LABELS,
}) => {
  const mergedLabels = {
    header: { ...DEFAULT_BATTLE_LABELS.header, ...labels.header },
    teams: { ...DEFAULT_BATTLE_LABELS.teams, ...labels.teams },
    metadata: { ...DEFAULT_BATTLE_LABELS.metadata, ...labels.metadata },
  };

  const attackingTeam = battle.warriors.filter((w: any) => w.team === 1);
  const defendingTeam = battle.warriors.filter((w: any) => w.team === 2);

  const userTeam = battle.warriors.find(
    (w: any) => w.originalId === (currentUserCharacterId || battle.characterId)
  );

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
    <div className="w-full">
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
      <div
        className={cn(
          "bg-gradient-to-r via-transparent text-white relative border-b",
          {
            "from-red-400/10 to-green-400/10": userTeam?.team === 2,
            "from-green-400/10 to-red-400/10": userTeam?.team === 1,
          }
        )}
      >
        <div className="p-4 pt-12 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BattleTeamSection
              team={attackingTeam}
              teamNumber={1}
              userTeam={userTeam?.team}
              characterId={currentUserCharacterId || battle.characterId}
              cdnBaseUrl={cdnBaseUrl}
              teamLabels={mergedLabels.teams}
            />
            <div className="grid grid-cols-3 items-center justify-items-center">
              <div>
                <AnimatedTrophy
                  show={battle.winningTeam === 1}
                  isUserTeamWinner={userTeam?.team === 1}
                />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">VS</div>
              </div>
              <div>
                <AnimatedTrophy
                  show={battle.winningTeam === 2}
                  isUserTeamWinner={userTeam?.team === 2}
                />
              </div>
            </div>

            <BattleTeamSection
              team={defendingTeam}
              teamNumber={2}
              userTeam={userTeam?.team}
              characterId={currentUserCharacterId || battle.characterId}
              cdnBaseUrl={cdnBaseUrl}
              teamLabels={mergedLabels.teams}
            />
          </div>
        </div>
        <BattleMetadata battle={battle} labels={mergedLabels.metadata} />
      </div>
    </div>
  );
};