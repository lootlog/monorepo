import type { Warrior } from "@/hooks/api/battle-log/use-battles";
import { Card } from "@lootlog/ui/components/card";
import { BattleLogList } from "./battle-log-list";
import { Sword } from "lucide-react";
import { useMemo, type FC } from "react";
import type { RawBattle } from "@/hooks/api/battle-log/use-battle-raw";

export type BattleLogProps = {
  rawBattle: RawBattle;
  warriors: Warrior[];
};

export const BattleLog: FC<BattleLogProps> = ({ rawBattle, warriors }) => {
  const userTeam = useMemo(() => {
    return warriors.find((w) => w.originalId === rawBattle.characterId)?.team;
  }, [warriors, rawBattle.characterId]);

  return (
    <Card className="border-border bg-card/40 backdrop-blur-sm overflow-hidden gap-0 p-0">
      <div className="sticky top-0 z-8 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Sword className="h-5 w-5" />
              Przebieg walki
            </div>
          </div>
        </div>
      </div>
      <BattleLogList
        events={rawBattle.events}
        characterId={rawBattle.characterId}
        userTeam={userTeam}
        warriors={warriors}
      />
    </Card>
  );
};
