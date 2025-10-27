import { useBattle } from "@/hooks/api/battle-log/use-battle";
import { useBattleRaw } from "@/hooks/api/battle-log/use-battle-raw";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  BattleLog,
  BattleOverviewCard,
  BattleStatsTable,
} from "@/components/battle";

const CDN_BASE_URL = "https://micc.garmory-cdn.cloud/obrazki/postacie";

export const PublicBattle = () => {
  const { id: battleId } = useParams({ from: "/battles/$id" });

  const {
    data: battle,
    isLoading: isBattleLoading,
    error: battleError,
  } = useBattle({ battleId: battleId ?? undefined, isPublic: true });
  const { data: rawBattle, isLoading: isRawBattleLoading } = useBattleRaw({
    battleId: battleId ?? undefined,
    isPublic: true,
  });

  const isLoading = isBattleLoading || isRawBattleLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Ładowanie walki...</p>
        </div>
      </div>
    );
  }

  if (battleError || !battle || !rawBattle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Nie znaleziono walki
          </h1>
          <p className="text-muted-foreground">
            {battleError?.message ||
              "Przepraszamy, nie mogliśmy znaleźć tej walki."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <ScrollArea className="h-full">
        <BattleOverviewCard
          battle={battle}
          cdnBaseUrl={CDN_BASE_URL}
          showActions={false}
        />
        <BattleStatsTable battle={battle} className="sm:max-w-full" />
        <BattleLog rawBattle={rawBattle.rawData} warriors={battle.warriors} />
      </ScrollArea>
    </div>
  );
};
