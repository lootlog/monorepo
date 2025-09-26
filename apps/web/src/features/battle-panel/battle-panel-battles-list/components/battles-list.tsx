import { useBattles } from "@/hooks/api/battle-log/use-battles";
import { BattlesListEntry } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list-entry";

export const BattlesList = () => {
  const { data: battlesResponse } = useBattles();

  return (
    <div>
      {battlesResponse?.battles.map((battle) => (
        <BattlesListEntry key={battle.id} battle={battle} />
      ))}
    </div>
  );
};
