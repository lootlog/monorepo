import { BattleLog, BattleStatsTable } from "@/components/battle";
import { BattleOverview } from "@/features/battle-panel/battle-panel-single-battle/components/battle-overview";
import { useBattle } from "@/hooks/api/battle-log/use-battle";
import { useBattleRaw } from "@/hooks/api/battle-log/use-battle-raw";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

export const BattlePanelSingleBattle = () => {
  const { battleId } = useParams({
    from: "/_authenticated/@me/battle-panel/battles_/$battleId",
  });
  const { data: battle } = useBattle({ battleId });
  const { data: rawBattle } = useBattleRaw({ battleId });

  const is1v1 = battle?.type === "1v1";

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="px-3 py-3 flex flex-col gap-4">
        {battle && <BattleOverview battle={battle} />}

        {is1v1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {rawBattle && battle && (
                <BattleLog
                  rawBattle={rawBattle?.rawData}
                  warriors={battle.warriors}
                />
              )}
            </div>
            <div className="space-y-4">
              {battle && <BattleStatsTable battle={battle} />}
            </div>
          </div>
        ) : (
          <>
            {battle && <BattleStatsTable battle={battle} />}
            {rawBattle && battle && (
              <BattleLog
                rawBattle={rawBattle?.rawData}
                warriors={battle.warriors}
              />
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
};
