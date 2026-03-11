import { BattleLog, BattleStatsTable } from "@/components/battle";
import { BattleOverview } from "@/features/battle-panel/battle-panel-single-battle/components/battle-overview";
import { useBattle } from "@/hooks/api/battle-log/use-battle";
import { useBattleRaw } from "@/hooks/api/battle-log/use-battle-raw";
import { useParams } from "@tanstack/react-router";

export const BattlePanelSingleBattle = () => {
  const { battleId } = useParams({
    from: "/_authenticated/@me/battle-panel/battles_/$battleId",
  });
  const { data: battle } = useBattle({ battleId });
  const { data: rawBattle } = useBattleRaw({ battleId });

  return (
    <div className="w-full">
      {battle && <BattleOverview battle={battle} />}
      {battle && <BattleStatsTable battle={battle} />}
      {rawBattle && battle && (
        <BattleLog rawBattle={rawBattle?.rawData} warriors={battle.warriors} />
      )}
    </div>
  );
};
