import { Battle } from "@/hooks/api/battle-log/use-battles";
import { TeamDisplay } from "@/features/battle-panel/battle-panel-battles-list/components/battle-team-display";
import { formatSeconds } from "@/utils/date/format-seconds";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { Clock, Sword, Users } from "lucide-react";
import { FC } from "react";
import { Link } from "react-router-dom";

export type BattlesListEntryProps = {
  battle: Battle;
};

export const BattlesListEntry: FC<BattlesListEntryProps> = ({ battle }) => {
  const attackingTeam = battle.warriors.filter((w) => w.team === 1);
  const defendingTeam = battle.warriors.filter((w) => w.team === 2);

  const userTeam = battle.warriors.find(
    (w) => w.originalId === battle.characterId
  );

  return (
    <Link
      key={battle.id}
      to={`/@me/battle-panel/battles/${battle.id}`}
      className="block"
    >
      <div className="border-b p-4 pb-4 hover:bg-secondary transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge
              className={
                battle.winningTeam === userTeam?.team
                  ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
              }
            >
              {battle.winningTeam === userTeam?.team ? "Zwycięstwo" : "Porażka"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {battle.type}
            </Badge>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{getRelativeTime(battle.createdAt)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div
                className={cn("flex items-center gap-2 text-sm font-medium", {
                  "text-destructive": userTeam?.team !== 1,
                  "text-green-500": userTeam?.team === 1,
                })}
              >
                <Sword className="h-4 w-4" />
                {userTeam?.team === 1 ? "Twoja drużyna" : "Przeciwnicy"}
              </div>
              <TeamDisplay
                team={attackingTeam}
                characterId={battle.characterId}
              />
            </div>

            <div className="space-y-2">
              <div
                className={cn("flex items-center gap-2 text-sm font-medium", {
                  "text-destructive": userTeam?.team !== 2,
                  "text-green-500": userTeam?.team === 2,
                })}
              >
                <Sword className="h-4 w-4" />
                {userTeam?.team === 2 ? "Twoja drużyna" : "Przeciwnicy"}
              </div>
              <TeamDisplay
                team={defendingTeam}
                characterId={battle.characterId}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatSeconds(battle.duration)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {battle.type}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
