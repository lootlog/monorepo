import { createFileRoute } from "@tanstack/react-router";
import { LootStats } from "@/features/stats/loot-stats";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

const LootStatsPage: React.FC = () => {
  return (
    <ScrollArea className="h-full">
      <div className="w-full">
        <LootStats />
      </div>
    </ScrollArea>
  );
};

export const Route = createFileRoute("/_authenticated/$guildId/stats/loots")({
  component: LootStatsPage,
});
