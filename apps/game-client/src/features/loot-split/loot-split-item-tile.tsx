import type { ItemRarityEnum } from "@lootlog/schema/item-rarity";
import { itemIconUrl } from "@lootlog/domain/margonem-cdn";
import type { FC } from "react";
import { useGameStore } from "@/store/game.store";
import type { LootSplitItem } from "./loot-split-model";

const NI_FRAME_CLASS: Record<ItemRarityEnum, string> = {
  UNIQUE: "t-uniupg",
  HEROIC: "t-her",
  UPGRADED: "t-upgraded",
  LEGENDARY: "t-leg",
};

const SI_FRAME_CLASS: Record<ItemRarityEnum, string> = {
  UNIQUE: "t_uni",
  HEROIC: "t_her",
  UPGRADED: "t_upg",
  LEGENDARY: "t_leg",
};

export const LootSplitItemTile: FC<{ item: LootSplitItem }> = ({ item }) => {
  const gameInterface = useGameStore((state) => state.game?.interface);

  const icon = (
    <img
      alt={item.name}
      src={itemIconUrl(item.icon)}
      className="ll:absolute ll:inset-0 ll:size-8"
    />
  );

  return (
    <span className="ll:mx-auto ll:block ll:size-6 ll:overflow-hidden">
      {gameInterface === "si" ? (
        <span className="ll:relative ll:block ll:size-8 ll:origin-top-left ll:scale-75">
          {icon}
          <span
            className={`itemHighlighter ll:top-0 ll:left-0 ${item.rarity ? SI_FRAME_CLASS[item.rarity] : "t_norm"}`}
          />
        </span>
      ) : (
        <span
          className="item ll:relative ll:block ll:size-8 ll:origin-top-left ll:scale-75"
          data-item-type={item.rarity ? NI_FRAME_CLASS[item.rarity] : "t-norm"}
        >
          <span
            className={`highlight h-exist ll:top-0 ll:left-0 ${item.rarity ? NI_FRAME_CLASS[item.rarity] : "t-norm"}`}
          />
          {icon}
        </span>
      )}
    </span>
  );
};
