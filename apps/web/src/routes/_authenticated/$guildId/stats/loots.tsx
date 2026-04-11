import { createFileRoute } from "@tanstack/react-router";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { LootStats } from "@/features/guild/stats/loot-stats";
import { LootStatsPageSkeleton } from "@/features/guild/stats/loot-stats-page-skeleton";

function LootStatsPage() {
  return (
    <ScrollArea className="h-full">
      <div className="w-full">
        <LootStats />
      </div>
    </ScrollArea>
  );
}

export const Route = createFileRoute("/_authenticated/$guildId/stats/loots")({
  component: LootStatsPage,
  pendingComponent: LootStatsPageSkeleton,
});
