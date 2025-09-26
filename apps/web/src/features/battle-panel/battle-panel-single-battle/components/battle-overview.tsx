import { Battle } from "@/hooks/api/battle-log/use-battles";
import { PlayerTile } from "@/screens/guild/components/loots-list/player-tile";
import { formatSeconds } from "@/utils/date/format-seconds";
import { Separator } from "@lootlog/ui/components/separator";
import { cn } from "@lootlog/ui/lib/utils";
import { format } from "date-fns";
import { Sword, Users } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export type BattleOverviewProps = {
  battle: Battle;
};

export const BattleOverview: FC<BattleOverviewProps> = ({ battle }) => {
  const { t } = useTranslation();

  const attackingTeam = battle.warriors.filter((w) => w.team === 1);
  const defendingTeam = battle.warriors.filter((w) => w.team === 2);

  const userTeam = battle.warriors.find(
    (w) => w.originalId === battle.characterId
  );

  return (
    <div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            Przegląd walki
          </div>
          <div className="text-sm text-muted-foreground">
            {battle && format(battle.createdAt, "dd.MM.yyyy HH:mm")}
          </div>
        </div>
      </div>
      <Separator />
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team 1 */}
          <div className="space-y-3">
            <h3
              className={cn(
                "font-semibold flex items-center justify-center gap-2",
                {
                  "text-destructive": userTeam?.team !== 1,
                  "text-green-500": userTeam?.team === 1,
                }
              )}
            >
              <Sword className="h-5 w-5" />
              {userTeam?.team === 1 ? "Twoja drużyna" : "Przeciwnicy"}
            </h3>
            <div className="space-y-2">
              {attackingTeam?.map((warrior, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <PlayerTile player={warrior} />
                  <div>
                    <div className="font-medium text-defeat text-sm">
                      {warrior.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {warrior.lvl} {t(`professions.${warrior.prof}`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* VS Section */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">VS</div>
              <div className="text-sm text-muted-foreground">
                {formatSeconds(battle.duration)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {battle.type}
              </div>
            </div>
          </div>

          {/* Team 2 */}
          <div className="space-y-3">
            <h3
              className={cn(
                "font-semibold flex items-center justify-center gap-2",
                {
                  "text-destructive": userTeam?.team !== 2,
                  "text-green-500": userTeam?.team === 2,
                }
              )}
            >
              <Sword className="h-5 w-5" />
              {userTeam?.team === 2 ? "Twoja drużyna" : "Przeciwnicy"}
            </h3>
            <div className="space-y-2">
              {defendingTeam?.map((warrior, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <PlayerTile player={warrior} />
                  <div>
                    <div className="font-medium text-green-500 text-sm">
                      {warrior.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {warrior.lvl} {t(`professions.${warrior.prof}`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
