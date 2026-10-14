import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { LootlogConfigNpcResponseDtoOutput as LootlogConfigNpc } from "@lootlog/client/main";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Gem } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NPC_RARITY_CONFIG } from "./npc-rarity-config";
import { NpcRarityMarks } from "./npc-rarity-marks";

type NpcTileProps = {
  guildId: string;
  npc: LootlogConfigNpc;
};

/** One kind of monster and the rarities collected for it; the tile opens it. */
export const NpcTile = ({ guildId, npc }: NpcTileProps) => {
  const { t } = useTranslation();

  const enabledRarities = NPC_RARITY_CONFIG.filter((rarity) =>
    npc.allowedRarities.includes(rarity.key),
  );

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <Link
        to="/$guildId/settings/npcs/$npcId"
        params={{ guildId, npcId: String(npc.id) }}
        className={cn(
          getListTileLinkClassName(false),
          "transition-colors hover:bg-muted/30 motion-reduce:transition-none",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold">
            {t(`npcType.${npc.npcType}`)}
          </span>
          <MetaItem icon={Gem}>
            {enabledRarities.length > 0
              ? t("settings.npcs.rarityCountCompact", {
                  count: enabledRarities.length,
                  total: NPC_RARITY_CONFIG.length,
                })
              : t("settings.npcs.noRarities")}
          </MetaItem>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <NpcRarityMarks rarities={enabledRarities} side="top" />
        </span>
      </Link>
    </div>
  );
};
