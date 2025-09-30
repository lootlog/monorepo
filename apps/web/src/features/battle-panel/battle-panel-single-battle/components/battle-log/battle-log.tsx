import { BattleLogList } from "@/features/battle-panel/battle-panel-single-battle/components/battle-log/battle-log-list";
import { RawBattle } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { Sword } from "lucide-react";
import { FC, useMemo } from "react";

export type BattleLogProps = {
  rawBattle: RawBattle;
  warriors: Warrior[];
};

export const BattleLog: FC<BattleLogProps> = ({ rawBattle, warriors }) => {
  const userTeam = useMemo(() => {
    return warriors.find((w) => w.originalId === rawBattle.characterId)?.team;
  }, [warriors, rawBattle.characterId]);

  return (
    <div>
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
    </div>
  );
};
