import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useGlobalStore } from "@/store/global.store";
import {
  GameNpcWithLocation,
  PickedNpcType,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { GameNpc } from "@/types/margonem/npcs";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { Separator } from "@radix-ui/react-select";
import { XIcon } from "lucide-react";
import { FC, Fragment } from "react";

export type NpcListItemProps = {
  npc: GameNpcWithLocation;
};

export const NpcListItem: FC<NpcListItemProps> = ({ npc }) => {
  const { npcs, removeNpc, settings } = useNpcDetectorStore();
  const { characterId } = useGlobalStore((s) => s.gameState);
  const { setOpen } = useWindowsStore();
  const npcType = getNpcTypeByWt(npc.wt);

  const settingsByNpcType = settings[characterId!][npcType as PickedNpcType];

  const handleRemoveNpc = (npcId: number) => {
    removeNpc(npcId);
  };

  const handleSendNotification = (npc: GameNpc) => {
    // setOpen("create-notification", true, { npc });
    // send notification
  };

  const handleSendChatNotification = (npc: GameNpc) => {
    // send
  };

  const canRender = settingsByNpcType.notifyWindow;

  return (
    canRender && (
      <Fragment key={npc.id}>
        <span className="ll-flex ll-justify-between ll-py-2 ll-gap-4">
          <NpcTile npc={npc} />
          <span className="ll-flex ll-flex-col ll-gap-1 ll-flex-1">
            <span>
              <span className="ll-font-semibold">{npc.nick} </span>
              <span>
                ({npc.lvl}
                {npc.prof})
              </span>
            </span>
            <span className="ll-mb-2 ll-text-xs">
              {npc.location} ({npc.x}, {npc.y})
            </span>
            <span className="ll-flex ll-gap-1">
              <Button onClick={() => handleSendNotification(npc)}>
                Komunikat
              </Button>
              <Button onClick={() => handleSendChatNotification(npc)}>
                Wiadomość na czat
              </Button>
            </span>
          </span>
          {npcs.length > 0 && (
            <span className="ll-mr-2">
              <XIcon
                className={cn(
                  "ll-custom-cursor-pointer ll-text-gray-400 hover:ll-text-gray-300"
                )}
                size="16"
                onClick={() => handleRemoveNpc(npc.id)}
              />
            </span>
          )}
        </span>
        {npcs.length > 1 && <Separator className="ll-bg-gray-600 ll-h-[1px]" />}
      </Fragment>
    )
  );
};
