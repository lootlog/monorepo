import { useRef, Fragment, useEffect, useState } from "react";
import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NpcType } from "@/hooks/api/use-npcs";
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
import { PortalShadow } from "@/components/ui/portal-shadow";

export type NpcListItemProps = {
  npc: GameNpcWithLocation;
};

const BASE_SHADOW_COLOR_BY_NPC_TYPE: Record<PickedNpcType, string> = {
  [NpcType.ELITE2]: "0 0 16px 8px rgba(239, 68, 68, 0.5)", // Red
  [NpcType.HERO]: "0 0 80px 32px rgba(147, 51, 234, 0.4)", // Purple
  [NpcType.TITAN]: "0 0 80px 32px rgba(234, 179, 8, 0.35)", // Yellow
  [NpcType.COLOSSUS]: "0 0 80px 32px rgba(59, 130, 246, 0.4)", // Blue
};

export const NpcListItem = ({ npc }: NpcListItemProps) => {
  const ref = useRef<HTMLElement>(null!);
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

  const boxShadow =
    BASE_SHADOW_COLOR_BY_NPC_TYPE[npcType as PickedNpcType] ||
    "0 0 80px 32px rgba(0, 0, 0, 0.15)";

  return (
    <Fragment key={npc.id}>
      <span
        ref={ref}
        className={cn(
          "ll-flex ll-justify-between ll-py-2 ll-gap-4 ll-rounded-lg ll-px-3"
        )}
        style={{
          position: "relative",
          backgroundColor: "rgba(239, 68, 68, 0.25)",
          zIndex: 1,
        }}
      >
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
                "ll-custom-cursor-pointer ll-text-gray-400 hover:ll-text-red-400 ll-transition-colors"
              )}
              size="16"
              onClick={() => handleRemoveNpc(npc.id)}
            />
          </span>
        )}
      </span>

      <PortalShadow
        targetRef={ref}
        boxShadow={boxShadow}
        className="ll-rounded-lg"
      />

      {npcs.length > 1 && <Separator className="ll-bg-gray-600 ll-h-[1px]" />}
    </Fragment>
  );
};
