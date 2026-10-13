import { NpcTile as SharedNpcTile } from "@lootlog/ui/components/npc-tile";
import type { NpcHitDtoOutput } from "@lootlog/client/search";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type NpcTileProps = {
  className?: string;
  imageClassName?: string;
  npc: Partial<NpcHitDtoOutput>;
};

export const NpcTile: FC<NpcTileProps> = ({
  className = "",
  imageClassName,
  npc,
}) => {
  const { t } = useTranslation();

  return (
    <SharedNpcTile
      className={className}
      imageClassName={imageClassName}
      levelLabel={(level) => t("common.levelShort", { level })}
      npc={npc}
    />
  );
};
