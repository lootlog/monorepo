import {
  NpcTile as SharedNpcTile,
  type NpcTileNpc,
} from "@lootlog/ui/components/npc-tile";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type NpcTileProps = {
  className?: string;
  imageClassName?: string;
  npc: NpcTileNpc;
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
