import { NpcTile as SharedNpcTile } from "@lootlog/ui/components/npc-tile";
import type { NpcHitDtoOutput } from "@/lib/api/generated/search/model";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type NpcTileProps = {
  className?: string;
  npc: Partial<NpcHitDtoOutput>;
};

export const NpcTile: FC<NpcTileProps> = ({ className = "", npc }) => {
  const { t } = useTranslation();

  return (
    <SharedNpcTile
      className={className}
      levelLabel={(level) => t("common.levelShort", { level })}
      npc={npc}
    />
  );
};
