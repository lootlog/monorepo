import { BattleLogList } from "@/features/battle-panel/battle-panel-single-battle/components/battle-log/battle-log-list";
import { RawBattle } from "@/hooks/api/battle-log/use-battle-raw";
import { Warrior } from "@/hooks/api/battle-log/use-battles";
import { Separator } from "@lootlog/ui/components/separator";
import { Sword } from "lucide-react";
import { FC } from "react";

export type BattleLogProps = {
  rawBattle: RawBattle;
  warriors: Warrior[];
};

export const BattleLog: FC<BattleLogProps> = ({ rawBattle, warriors }) => {
  return (
    <div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Sword className="h-5 w-5" />
            Przebieg walki
          </div>
        </div>
      </div>
      <Separator />
      <BattleLogList
        events={rawBattle.parsedEvents}
        characterId={rawBattle.characterId}
        warriors={warriors}
      />
    </div>
  );
};
