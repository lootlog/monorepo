import { Battle } from "@/hooks/api/battle-log/use-battles";
import { TeamDisplay } from "@/screens/battles-panel/components/battle-team-display";
import { Badge } from "@lootlog/ui/components/badge";
import { Clock, Sword, Users } from "lucide-react";
import { FC } from "react";

export type BattlesListEntryProps = {
  battle: Battle;
};

export const BattlesListEntry: FC<BattlesListEntryProps> = ({ battle }) => {
  const attackingTeam = battle.warriors.filter((w) => w.team === 1);
  const defendingTeam = battle.warriors.filter((w) => w.team === 2);

  return (
    <div
      key={battle.id}
      className="border-b p-4 pb-4 hover:bg-secondary transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge
            variant={"green"}
            // className={
            //   battle.result === "win"
            //     ? "bg-primary/10 text-primary hover:bg-primary/20"
            //     : "bg-muted text-muted-foreground"
            // }
          >
            {"Zwycięstwo"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {battle.type}
          </Badge>
          {/* <span className="text-sm font-medium">{battle.map}</span> */}
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>{battle.createdAt}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-green-500">
              <Sword className="h-4 w-4" />
              Twoja drużyna
            </div>
            <TeamDisplay team={attackingTeam} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <Sword className="h-4 w-4" />
              Przeciwnicy
            </div>
            <TeamDisplay team={defendingTeam} />
          </div>
        </div>

        <div className="flex items-center gap-6 pt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {battle.duration}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {battle.type}
          </span>
        </div>
      </div>
    </div>
  );
};
