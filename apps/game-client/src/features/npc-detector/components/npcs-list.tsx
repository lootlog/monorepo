import { ScrollArea } from "@/components/ui/scroll-area";
import { NpcListItem } from "@/features/npc-detector/components/npc-list-item";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { FC } from "react";

export const NpcsList: FC = () => {
  const { npcs, settings } = useNpcDetectorStore();

  return (
    <ScrollArea
      className="ll-p-2 ll-flex ll-flex-col ll-gap-4 ll-w-full ll-box-border ll-mt-1 ll-pl-4 ll-max-h-64"
      type="auto"
    >
      {npcs.map((npc, i) => {
        return <NpcListItem key={npc.id} npc={npc} />;
      })}
    </ScrollArea>
  );
};
