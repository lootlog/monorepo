import { Fragment } from "react";
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

export type NpcListItemProps = {
  npc: GameNpcWithLocation;
  idx: number;
};

const BASE_SHADOW_COLOR_BY_NPC_TYPE: Record<PickedNpcType, string> = {
  [NpcType.COLOSSUS]: "0 0 80px 40px rgba(53, 255, 105, 0.7)", // green
  [NpcType.HERO]: "0 0 80px 40px rgba(220, 247, 99, 0.7)", // yellow
  [NpcType.ELITE2]: "0 0 80px 40px rgba(219, 90, 186, 0.7)", // rose
  [NpcType.TITAN]: "0 0 80px 40px rgba(59, 130, 246, 0.7)", // blue
};

export const NpcListItem = ({ npc, idx }: NpcListItemProps) => {
  const { npcs, removeNpc, settings, setNpcState } = useNpcDetectorStore();
  const { characterId, world } = useGlobalStore((s) => s.gameState);
  const { mutate: sendChatMessage } = useSendChatMessage();
  const { mutate: createNotification } = useCreateNotification();

  const npcType = getNpcTypeByWt(npc.wt);

  const settingsByNpcType = settings[characterId!][npcType as PickedNpcType];

  const handleRemoveNpc = (npcId: number) => {
    removeNpc(npcId);
  };

  const handleSendNotification = (npc: GameNpcWithLocation) => {
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
    const chatMessage = composeNpcChatMessage(
      npcType,
      `${npc.nick} (${npc.lvl}${npc.prof})`
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

  const boxShadow = settingsByNpcType.highlight
    ? BASE_SHADOW_COLOR_BY_NPC_TYPE[npcType as PickedNpcType]
    : "";

  return (
    <Fragment key={npc.id}>
      <span
        className={cn(
          "ll-flex ll-justify-between ll-py-2 ll-gap-4 ll-rounded-lg ll-px-3"
        )}
        style={{ zIndex: npcs.length - idx }}
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
            <Button
              disabled={npc.notificationSent}
              onClick={() => handleSendNotification(npc)}
            >
              {npc.notificationSent ? "Wysłano" : "Komunikat"}
            </Button>
            <Button
              disabled={npc.msgSent}
              onClick={() => handleSendChatNotification(npc)}
            >
              {npc.msgSent ? "Wysłano" : "Wiadomość na czat"}
            </Button>
          </span>
        </span>
        {npcs.length > 0 && (
          <XIcon
            className={cn(
              "ll-custom-cursor-pointer ll-text-gray-300 hover:ll-text-gray-100 ll-transition-colors"
            )}
            size="16"
            onClick={() => handleRemoveNpc(npc.id)}
          />
        )}
      </span>

      {npcs.length > 0 && (
        <Separator
          className="ll-bg-gray-600 ll-h-[1px]"
          style={{
            boxShadow,
          }}
        />
      )}
    </Fragment>
  );
};
