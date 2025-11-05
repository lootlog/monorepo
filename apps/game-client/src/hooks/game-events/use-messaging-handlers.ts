import { NPCS_WITH_LOCATION } from "@/features/npc-detector/components/npc-list-item";
import { composeNpcChatMessage } from "@/utils/chat/compose-npc-chat-message";
import type { NpcLocation } from "./types";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import { useWindowsStore } from "@/store/windows.store";
import type { NpcType } from "@/hooks/api/use-npcs";
import { Game } from "@/lib/game";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";

export const useMessagingHandlers = () => {
  const { mutate: sendChatMessage } = useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();

  const { setOpen } = useWindowsStore();

  const handleSendMessage = (
    npcType: NpcType,
    baseMessage: string,
    npcLocation: NpcLocation,
    guildIds: string[],
  ) => {
    let location = "";

    if (NPCS_WITH_LOCATION.includes(npcType)) {
      location = `${npcLocation.name} (${npcLocation.x}, ${npcLocation.y})`;
    }

    const chatMessage = composeNpcChatMessage(npcType, baseMessage, location);

    sendChatMessage(
      {
        message: chatMessage,
        guildIds,
      },
      {
        onSuccess: () => {
          setOpen("npc-detector", true);
        },
      },
    );
  };

  const handleSendNotification = (
    npc: GameNpcWithLocation,
    guildIds: string[],
  ) => {
    const world = Game.getWorldName();

    const payload = {
      npc: {
        id: npc.id,
        hpp: 0,
        location: npc.location,
        name: npc.nick,
        wt: npc.wt,
        x: npc.x,
        y: npc.y,
        lvl: npc.lvl,
        prof: npc.prof,
        icon: npc.icon,
        type: npc.type,
      },
      world,
      guildIds,
    };

    createNotification(payload);
  };

  return {
    handleSendMessage,
    handleSendNotification,
  };
};
