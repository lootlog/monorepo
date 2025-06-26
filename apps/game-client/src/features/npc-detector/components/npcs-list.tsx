import { ScrollArea } from "@/components/ui/scroll-area";
import { NpcListItem } from "@/features/npc-detector/components/npc-list-item";
import { GameNpcWithLocation } from "@/store/npc-detector.store";
import { FC } from "react";

type NpcsListProps = {
  npcs?: GameNpcWithLocation[];
};

export const NpcsList: FC<NpcsListProps> = ({ npcs }) => {
  return (
    <ScrollArea
      className="ll-p-0 ll-flex ll-flex-col ll-gap-4 ll-w-full ll-box-border ll-mt-1 ll-pl-0 ll-max-h-64"
      type="auto"
    >
      {npcs?.map((npc, i) => {
        return <NpcListItem key={npc.id} npc={npc} idx={i} />;
      })}
    </ScrollArea>
  );
};
