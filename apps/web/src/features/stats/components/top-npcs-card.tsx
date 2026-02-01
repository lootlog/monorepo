import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useLocalStorage } from "usehooks-ts";
import { ArrowRight, Crown, Medal, Skull, Trophy } from "lucide-react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NpcTile } from "@/components/tiles/npc-tile";
import { cn } from "@lootlog/ui/lib/utils";
import { useGuildTopNpcs } from "../hooks/use-guild-top-npcs";
import { TRACKABLE_NPC_TYPES } from "../constants";
import type { NpcType } from "../hooks/use-guild-kill-stats";

const STORAGE_KEY = "stats-top-npcs-type";

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 1:
      return <Trophy className="h-4 w-4 text-slate-400" />;
    case 2:
      return <Medal className="h-4 w-4 text-amber-600" />;
    default:
      return null;
  }
};

type TopNpcsCardProps = {
  world?: string;
};

export const TopNpcsCard: React.FC<TopNpcsCardProps> = ({ world }) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const [selectedNpcType, setSelectedNpcType] = useLocalStorage<NpcType>(
    STORAGE_KEY,
    "ELITE2",
  );

  const { data, isLoading } = useGuildTopNpcs({
    limit: 5,
    npcType: selectedNpcType,
    world,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5" />
              <Skeleton className="h-5 w-40" />
            </CardTitle>
            <Skeleton className="h-8 w-[120px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topNpcs = data?.topNpcs?.slice(0, 5) ?? [];

  if (!guildId) {
    return null;
  }

  return (
    <Card className="py-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5" />
            {t("kills.topNpcs.title")}
          </CardTitle>
          <Select
            value={selectedNpcType}
            onValueChange={(value) => setSelectedNpcType(value as NpcType)}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRACKABLE_NPC_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`npcType.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {topNpcs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("kills.topNpcs.noData")}
          </p>
        ) : (
          <>
            {topNpcs.map((npc, index) => (
              <Link
                key={npc.npcId}
                to="/$guildId/stats/npcs/$npcId"
                params={{ guildId, npcId: String(npc.npcId) }}
                className={cn(
                  "flex items-center justify-between py-2 px-2 rounded-md transition-colors hover:bg-muted/30",
                  index === 0 && "bg-yellow-500/5",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    {getRankIcon(index) ?? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  {npc.npcIcon && (
                    <NpcTile
                      npc={{
                        id: npc.npcId,
                        name: npc.npcName,
                        lvl: npc.npcLvl,
                        icon: npc.npcIcon,
                      }}
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {npc.npcName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {npc.npcLvl}
                      {npc.npcProf}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                  <span className="text-xs text-muted-foreground">x</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {npc.totalKills.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
            <Link
              to="/$guildId/stats/npcs"
              params={{ guildId }}
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pt-4"
            >
              {t("kills.topNpcs.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
};
