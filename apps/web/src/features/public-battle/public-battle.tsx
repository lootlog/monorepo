import {
  usePublicBattlesControllerGetPublicBattle,
  usePublicBattlesControllerGetPublicBattleRaw,
} from "@/lib/api/generated/battlelog/public-battles/public-battles";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  BattleLog,
  BattleOverviewCard,
  BattleStatsTable,
} from "@/components/battle";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Card } from "@lootlog/ui/components/card";

const CDN_BASE_URL = "https://micc.garmory-cdn.cloud/obrazki/postacie";

export const PublicBattle = () => {
  const { id: battleId } = useParams({ from: "/battles/$id" });

  const {
    data: battle,
    isLoading: isBattleLoading,
    error: battleError,
  } = usePublicBattlesControllerGetPublicBattle({ battleId });
  const { data: rawBattle, isLoading: isRawBattleLoading } =
    usePublicBattlesControllerGetPublicBattleRaw({ battleId });

  const isLoading = isBattleLoading || isRawBattleLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </Card>
        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex h-12 items-center gap-4 border-b border-border px-4"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </Card>
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
    <div className="h-dvh bg-background">
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
