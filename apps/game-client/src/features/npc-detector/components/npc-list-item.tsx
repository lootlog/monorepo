import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import { NpcType } from "@/hooks/api/use-npcs";
import { cn } from "@/lib/utils";
import { useGlobalStore } from "@/store/global.store";
import {
  GameNpcWithLocation,
  PickedNpcType,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { Separator } from "@radix-ui/react-select";
import { XIcon } from "lucide-react";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import { composeNpcChatMessage } from "@/utils/chat/compose-npc-chat-message";
import {
  getBackgroundColor,
  getGradient,
} from "@/utils/notifications-and-detector/background";

export type NpcListItemProps = {
  npc: GameNpcWithLocation;
  idx: number;
};

const NPCS_WITH_LOCATION = [NpcType.HERO];

export const NpcListItem = ({ npc, idx }: NpcListItemProps) => {
  const { npcs, removeNpc, settings, setNpcState } = useNpcDetectorStore();
  const { characterId, world } = useGlobalStore((s) => s.gameState);
  const { mutate: sendChatMessage, isPending: isSendChatMessagePending } =
    useSendChatMessage();
  const { mutate: createNotification, isPending: isCreateNotificationPending } =
    useCreateNotification();

  const npcType = getNpcTypeByWt(npc.wt, npc.prof, npc.type);
  const settingsByNpcType = settings[characterId!][npcType as PickedNpcType];
  const key = npcType;

  const handleRemoveNpc = (npcId: number) => {
    removeNpc(npcId);
  };

  const handleSendNotification = (npc: GameNpcWithLocation) => {
    if (settingsByNpcType.guildIds?.length === 0) {
      window.message("Brak ustawionych gildii do wysłania komunikatu.");
      return;
    }

    if (!npc || !world) return;

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
      world: world,
      guildIds: settingsByNpcType.guildIds,
    };

    createNotification(payload, {
      onSuccess: () => {
        setNpcState(npc.id, {
          ...npc,
          notificationSent: true,
        });
      },
    });
  };

  const handleSendChatNotification = (npc: GameNpcWithLocation) => {
    if (settingsByNpcType.guildIds?.length === 0) {
      window.message("Brak ustawionych gildii do wysłania wiadomości na czat.");
      return;
    }

    let location = "";

    if (NPCS_WITH_LOCATION.includes(npcType)) {
      location = `${npc.location} (${npc.x}, ${npc.y})`;
    }

    const chatMessage = composeNpcChatMessage(
      npcType,
      `${npc.nick} (${npc.lvl}${npc.prof ?? ""})`,
      location
    );

    sendChatMessage(
      {
        message: chatMessage,
        guildIds: settingsByNpcType.guildIds,
      },
      {
        onSuccess: () => {
          setNpcState(npc.id, {
            ...npc,
            msgSent: true,
          });
        },
      }
    );
  };

  return (
    <span key={npc.id}>
      <span
        className={cn("ll-flex ll-justify-between ll-py-2 ll-gap-4 ll-px-3")}
        style={{
          background:
            idx === 0
              ? getGradient(key, settingsByNpcType?.highlight)
              : getBackgroundColor(key, settingsByNpcType?.highlight),
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
            {settingsByNpcType.guildIds?.length === 0 && (
              <span>Brak ustawionych serwerów - odwiedź ustawienia</span>
            )}
            {settingsByNpcType.guildIds?.length > 0 && (
              <>
                <Button
                  disabled={isCreateNotificationPending || npc.notificationSent}
                  onClick={() => handleSendNotification(npc)}
                >
                  {npc.notificationSent ? "Wysłano" : "Komunikat"}
                </Button>
                <Button
                  disabled={isSendChatMessagePending || npc.msgSent}
                  onClick={() => handleSendChatNotification(npc)}
                >
                  {npc.msgSent ? "Wysłano" : "Wiadomość"}
                </Button>
              </>
            )}
          </span>
        </span>
        {npcs.length > 1 && (
          <XIcon
            className={cn(
              "ll-custom-cursor-pointer ll-text-gray-300 hover:ll-text-gray-100 ll-transition-colors"
            )}
            size="16"
            onClick={() => handleRemoveNpc(npc.id)}
          />
        )}
      </span>

      {npcs.length > 1 && <Separator className="ll-bg-gray-600 ll-h-[1px]" />}
    </span>
  );
};
