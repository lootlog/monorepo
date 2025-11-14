import {
  MessageType,
  useSendChatMessage,
} from "@/hooks/api/use-send-chat-message";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import { useWindowsStore } from "@/store/windows.store";
import { Game } from "@/lib/game";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";

export const useMessagingHandlers = () => {
  const { mutate: sendChatMessage } = useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();

  const { setOpen } = useWindowsStore();

  const handleSendMessage = (guildIds: string[], npc: GameNpcWithLocation) => {
    sendChatMessage(
      {
        message: "",
        guildIds,
        type: MessageType.NPC,
        characterData: {
          nick: Game.hero.nick,
          id: Game.hero.id,
          acc: Game.hero.account,
          lvl: Game.hero.lvl,
          prof: Game.hero.prof,
          icon: Game.hero.img,
        },
        npc: {
          x: npc.x,
          y: npc.y,
          icon: npc.icon,
          id: npc.id,
          name: npc.nick,
          lvl: npc.lvl,
          prof: npc.prof,
          type: npc.type,
          hpp: 0,
          location: npc.location,
          wt: npc.wt,
        },
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
