import { Battle } from "@/hooks/api/battle-log/use-battles";
import { TeamDisplay } from "@/features/battle-panel/battle-panel-battles-list/components/battle-team-display";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { Sword } from "lucide-react";
import { FC } from "react";
import { Link } from "react-router-dom";
import { BattleMetadata } from "@/components/battle/battle-metadata";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";

export type BattlesListEntryProps = {
  battle: Battle;
  onResultClick?: (result: "won" | "lost" | "flee") => void;
  onWorldClick?: (world: string) => void;
  onPhClick?: () => void;
};

export const BattlesListEntry: FC<BattlesListEntryProps> = ({
  battle,
  onResultClick,
  onWorldClick,
  onPhClick,
}) => {
  const attackingTeam = battle.warriors.filter((w) => w.team === 1);
  const defendingTeam = battle.warriors.filter((w) => w.team === 2);

  const userTeam = battle.warriors.find(
    (w) => w.originalId === battle.characterId
  );

  const warrior = battle.warriors.find(
    (w) => w.originalId === battle.characterId
  );

  const leftTeam = userTeam?.team === 1 ? attackingTeam : defendingTeam;
  const rightTeam = userTeam?.team === 1 ? defendingTeam : attackingTeam;

  const handleResultClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onResultClick) {
      if (battle.hasFlee) {
        onResultClick("flee");
      } else if (battle.winningTeam === userTeam?.team) {
        onResultClick("won");
      } else {
        onResultClick("lost");
      }
    }
  };

  const handleWorldClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWorldClick) {
      onWorldClick(battle.world);
    }
  };

  const handlePhClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPhClick) {
      onPhClick();
    }
  };

  const isWon = !battle.hasFlee && battle.winningTeam === userTeam?.team;
  const isLost = !battle.hasFlee && battle.winningTeam !== userTeam?.team;

  return (
    <Link
      key={battle.id}
      to={`/@me/battle-panel/battles/${battle.id}`}
      className="block"
    >
      <div
        className={cn(
          "bg-gradient-to-r from-green-400/10 via-transparent to-red-400/10 text-white relative border-b transition-all duration-300",
          {
            "hover:via-green-400/10": isWon || battle.hasFlee,
            "hover:via-red-400/10": isLost,
          }
        )}
      >
        <div className="p-4 pb-4">
          <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Badge
                onClick={handleResultClick}
                className={cn("cursor-pointer whitespace-nowrap", {
                  "bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500":
                    isWon,
                  "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive":
                    isLost,
                  "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500":
                    battle.hasFlee,
                })}
              >
                {battle.hasFlee
                  ? "Ucieczka"
                  : battle.winningTeam === userTeam?.team
                    ? "Zwycięstwo"
                    : "Porażka"}
              </Badge>
              <Badge
                onClick={handleWorldClick}
                variant="outline"
                className="text-xs cursor-pointer border-foreground/50 whitespace-nowrap"
              >
                {capitalizeFirstLetter(battle.world)}
              </Badge>
              {warrior?.ph !== 0 && (
                <Badge
                  onClick={handlePhClick}
                  variant="outline"
                  className="text-xs cursor-pointer border-foreground/50 whitespace-nowrap"
                >
                  Punkty Honoru
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
              {getRelativeTime(battle.createdAt)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-500">
                  <Sword className="h-4 w-4" />
                  Twoja drużyna
                </div>
                <TeamDisplay
                  team={leftTeam}
                  characterId={battle.characterId}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <Sword className="h-4 w-4" />
                  Przeciwnicy
                </div>
                <TeamDisplay
                  team={rightTeam}
                  characterId={battle.characterId}
                />
              </div>
            </div>
          </div>
        </div>

        <BattleMetadata
          battle={battle}
          align="left"
          labels={{
            startTime: "Data i godzina rozpoczęcia walki",
            duration: "Czas trwania walki",
            battleType: "Typ walki",
            public: "Publiczna",
            private: "Prywatna",
            publicTooltip:
              "Walka jest publiczna - może być przeglądana przez osoby posiadające link",
            privateTooltip: "Walka jest prywatna - tylko Ty możesz ją zobaczyć",
          }}
        />
      </div>
    </Link>
  );
};
