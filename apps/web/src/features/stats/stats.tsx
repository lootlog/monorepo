import { useTranslation } from "react-i18next";
import { useParams } from "@tanstack/react-router";
import { useLocalStorage } from "usehooks-ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { useGuildKillStats } from "./hooks/use-guild-kill-stats";
import { NpcTypeStatsCards } from "./components/kill-stats-overview";
import { MemberRankingPodiumCard } from "./components/member-ranking-podium-card";
import { TopNpcsCard } from "./components/top-npcs-card";

const STORAGE_KEY = "stats-selected-world";

export const Stats: React.FC = () => {
  const { t } = useTranslation();
  const { guildId } = useParams({ from: "/_authenticated/$guildId" });
  const [selectedWorld, setSelectedWorld] = useLocalStorage<string | null>(
    STORAGE_KEY,
    null,
  );
  const { data: worlds } = useWorlds();
  const { data, isLoading } = useGuildKillStats({
    world: selectedWorld ?? undefined,
  });

  return (
    <ScrollArea className="h-full">
      <div className="w-full p-3">
        <div className="space-y-3">
          <div className="flex justify-end">
            <Select
              value={selectedWorld ?? "ALL"}
              onValueChange={(value) =>
                setSelectedWorld(value === "ALL" ? null : value)
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("kills.home.filters.world")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("kills.home.filters.allWorlds")}
                </SelectItem>
                {worlds?.map((world) => (
                  <SelectItem key={world} value={world}>
                    {world.charAt(0).toUpperCase() + world.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <NpcTypeStatsCards data={data?.overview} isLoading={isLoading} />

          <div className="grid gap-3 md:grid-cols-2">
            <MemberRankingPodiumCard
              data={data?.memberRanking}
              isLoading={isLoading}
              guildId={guildId}
            />
            <TopNpcsCard world={selectedWorld ?? undefined} />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
