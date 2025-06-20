import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { Game } from "@/lib/game";
import { cn } from "@/lib/utils";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { GameNpc } from "@/types/margonem/npcs";
import { Separator } from "@radix-ui/react-select";
import { XIcon } from "lucide-react";
import { FC, Fragment } from "react";

export const NpcsList: FC = () => {
  const { npcs, removeNpc } = useNpcDetectorStore();
  const { setOpen } = useWindowsStore();
  const location = Game.map.name;

  const handleRemoveNpc = (npcId: number) => {
    removeNpc(npcId);
  };

  const handleSendNotification = (npc: GameNpc) => {
    setOpen("create-notification", true, { npc });
  };

  return (
    <ScrollArea
      className="ll-p-2 ll-flex ll-flex-col ll-gap-4 ll-w-full ll-box-border ll-mt-1 ll-pl-4"
      type="auto"
    >
      {npcs.map((npc, i) => {
        const imageHasDomain =
          npc.icon.startsWith("http://") || npc.icon.startsWith("https://");

        return (
          <Fragment key={npc.id}>
            <span
              className={cn(
                "ll-flex ll-flex-row ll-gap-8 ll-w-full ll-justify-start ll-py-3 ll-relative",
                {
                  "ll-pt-0": i === 0,
                }
              )}
            >
              <XIcon
                className={cn(
                  "ll-absolute ll-top-2 ll-right-1 ll-custom-cursor-pointer ll-text-gray-400 hover:ll-text-gray-300",
                  {
                    "-ll-top-1": i === 0,
                    "ll-hidden": npcs.length === 1,
                  }
                )}
                size="16"
                onClick={() => handleRemoveNpc(npc.id)}
              />
              <span className="ll-w-10 ll-flex ll-items-center ll-justify-center ll-pl-2">
                <img
                  className={
                    "ll-relative ll-cursor-pointer ll-rounded-lg ll-max-h-16 ll-max-w-12"
                  }
                  draggable={false}
                  src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${npc.icon}`}
                  alt={npc.nick}
                />
              </span>
              <span className="ll-flex ll-flex-col ll-justify-center">
                <span>
                  <span className="ll-font-semibold">{npc.nick} </span>
                  <span>
                    ({npc.lvl}
                    {npc.prof})
                  </span>
                </span>
                <span className="ll-mb-2 ll-text-xs">
                  {location} ({npc.x}, {npc.y})
                </span>
                <Button onClick={() => handleSendNotification(npc)}>
                  Zawołaj
                </Button>
              </span>
            </span>
            {npcs.length > 1 && (
              <Separator className="ll-bg-gray-600 ll-h-[1px]" />
            )}
          </Fragment>
        );
      })}
    </ScrollArea>
  );
};
