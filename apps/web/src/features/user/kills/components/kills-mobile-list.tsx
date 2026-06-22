import { Badge } from "@lootlog/ui/components/badge";
import { NpcTile } from "@/components/tiles/npc-tile";
import type { UserNpcKillsResponseDtoOutputNpcsItem } from "@/lib/api/generated/main/model";
import { NPC_TYPE_NAMES } from "@/constants/npc";
import { useTranslation } from "react-i18next";

type KillsMobileListProps = {
  npcs: UserNpcKillsResponseDtoOutputNpcsItem[];
  startRank: number;
};

export const KillsMobileList = ({ npcs, startRank }: KillsMobileListProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2 p-3">
      {npcs.map((npc, index) => (
        <div
          key={`${npc.npcId}-${npc.npcName}`}
          className="rounded-md border border-border bg-background/80 p-3"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
              {startRank + index + 1}
            </div>
            {npc.npcIcon ? (
              <NpcTile
                className="shrink-0"
                npc={{
                  id: npc.npcId,
                  name: npc.npcName,
                  lvl: npc.npcLvl,
                  icon: npc.npcIcon,
                }}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {npc.npcName}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="max-w-full truncate">
                  {t("common.levelShort", { level: npc.npcLvl })}
                  {npc.npcProf}
                </Badge>
                <Badge variant="secondary" className="max-w-full truncate">
                  {t(`npcType.${npc.npcType}`, {
                    defaultValue:
                      NPC_TYPE_NAMES[
                        npc.npcType as keyof typeof NPC_TYPE_NAMES
                      ] ?? npc.npcType,
                  })}
                </Badge>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-base font-semibold tabular-nums">
                {npc.totalKills.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("kills.columns.kills")}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
