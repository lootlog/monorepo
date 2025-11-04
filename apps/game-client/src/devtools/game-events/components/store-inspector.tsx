import { useEffect, useState } from "react";
import { Button } from "@lootlog/ui";
import { RefreshCw } from "lucide-react";
import { gameEventsStore } from "@/store/game-store/game-events.store";
import { battleStore } from "@/store/game-store/battle.store";

export const StoreInspector = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Store State</h3>
        <Button size="sm" variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="border border-border rounded">
        <div className="px-4 py-2 bg-muted font-medium text-sm">
          gameEventsStore
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              pendingBattle
            </div>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(gameEventsStore.pendingBattle, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              talkingNpcId
            </div>
            <div className="text-sm">
              {gameEventsStore.talkingNpcId || "(null)"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              latestLootId
            </div>
            <div className="text-sm">
              {gameEventsStore.latestLootId ?? "(null)"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              eventHistory.length
            </div>
            <div className="text-sm">{gameEventsStore.eventHistory.length}</div>
          </div>
        </div>
      </div>

      <div className="border border-border rounded">
        <div className="px-4 py-2 bg-muted font-medium text-sm">
          battleStore
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              battleState
            </div>
            <div className="text-sm">{battleStore.battleState}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              lastBattleHash
            </div>
            <div className="text-sm font-mono text-xs break-all">
              {battleStore.lastBattleHash || "(empty)"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              events.length
            </div>
            <div className="text-sm">{battleStore.events.length}</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Auto-refreshes every second. Click Refresh for immediate update.
      </div>
    </div>
  );
};
