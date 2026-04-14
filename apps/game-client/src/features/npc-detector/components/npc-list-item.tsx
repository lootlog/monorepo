import { NpcTile } from "@/components/npc-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type DetectorNpcType,
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { getNpcTypeByWt } from "@lootlog/types";
import { Separator } from "@radix-ui/react-select";
import { XIcon } from "lucide-react";
import {
  MessageType,
  useSendChatMessage,
} from "@/hooks/api/use-send-chat-message";
import { useCreateNotification } from "@/hooks/api/use-create-notification";
import {
  getBackgroundColor,
  getGradient,
} from "@/utils/notifications-and-detector/background";
import { NpcType } from "@/hooks/api/use-npcs";
import { Game } from "@/lib/game";
import { getHeroCharacterData } from "@/utils/game/get-hero-character-data";
import { useEffect, useState } from "react";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { useSession } from "@/hooks/auth/use-session";

const BUTTON_UNLOCK_DELAY_MS = 5000;

type NpcListItemProps = {
  npc: GameNpcWithLocation;
  idx: number;
};

export const NPCS_WITH_LOCATION = [NpcType.HERO];

export const NpcListItem = ({ npc, idx }: NpcListItemProps) => {
  const { npcs, removeNpc, settings, setNpcState } = useNpcDetectorStore();
  const {
    setNotification,
    partyGathering,
    setPartyGathering,
    setChatMessageId,
  } = usePartyFinderStore();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;
  const characterId = String(Game.hero.id);
  const world = Game.getWorldName();
  const { mutate: sendChatMessage, mutateAsync: sendChatMessageAsync } =
    useSendChatMessage();
  const {
    mutate: createNotification,
    mutateAsync: createNotificationAsync,
    isPending: isCreateNotificationPending,
  } = useCreateNotification();
  const [isGatheringPartyPending, setIsGatheringPartyPending] = useState(false);

  const npcType = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);
  const settingsByNpcType = settings[characterId][npcType as DetectorNpcType];
  const key = npcType;

  const hasActivePartyGathering = partyGathering !== null;

  useEffect(() => {
    if (!npc.notificationSent) return;

    const timer = setTimeout(() => {
      setNpcState(npc.id, { ...npc, notificationSent: false });
    }, BUTTON_UNLOCK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [npc.notificationSent]);

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
      onSuccess: (response) => {
        setNpcState(npc.id, {
          ...npc,
          notificationSent: true,
        });

        setNotification(response.data.notificationId, {
          id: npc.id,
          name: npc.nick,
          lvl: npc.lvl,
          prof: npc.prof,
          location: npc.location,
          world: world,
          icon: npc.icon,
          x: npc.x,
          y: npc.y,
        });

        sendChatMessage({
          message: "",
          guildIds: settingsByNpcType.guildIds,
          type: MessageType.NPC,
          characterData: getHeroCharacterData(),
          npc: {
            x: npc.x,
            y: npc.y,
            icon: npc.icon,
            id: npc.id,
            name: npc.nick,
            hpp: 0,
            location: npc.location,
            lvl: npc.lvl,
            prof: npc.prof,
            type: npc.type,
            wt: npc.wt,
          },
        });

        setOpen("party-finder", true);
      },
    });
  };

  const handleGatherParty = async (npc: GameNpcWithLocation) => {
    if (settingsByNpcType.guildIds?.length === 0) {
      window.message("Brak ustawionych gildii do zbierania grupy.");
      return;
    }

    if (!npc || !world || !discordId) return;

    setIsGatheringPartyPending(true);

    try {
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
        isGatheringParty: true,
      };

      const notificationResponse = await createNotificationAsync(payload);

      const notificationId = notificationResponse.data.notificationId;
      const guildIds =
        notificationResponse.data.guildIds ?? settingsByNpcType.guildIds;
      const hero = Game.hero;

      setNotification(notificationId, {
        id: npc.id,
        name: npc.nick,
        lvl: npc.lvl,
        prof: npc.prof,
        location: npc.location,
        world: world,
        icon: npc.icon,
        x: npc.x,
        y: npc.y,
      });

      setPartyGathering({
        notificationId,
        discordId,
        character: {
          nick: hero.nick,
          lvl: hero.lvl,
          prof: hero.prof,
          characterId: String(hero.id),
          accountId: String(hero.account),
          icon: hero.img,
          clan: hero.clan
            ? { id: hero.clan.id, name: hero.clan.name }
            : undefined,
        },
        world,
        createdAt: new Date().toISOString(),
        guildIds,
      });

      const chatResults = await sendChatMessageAsync({
        message: `${npc.nick} (${npc.lvl}${npc.prof ?? ""})`,
        guildIds,
        type: MessageType.PARTY_GATHERING,
        characterData: {
          nick: hero.nick,
          id: hero.id,
          acc: hero.account,
          lvl: hero.lvl,
          prof: hero.prof,
          icon: hero.img,
        },
        npc: {
          x: npc.x,
          y: npc.y,
          icon: npc.icon,
          id: npc.id,
          name: npc.nick,
          hpp: 0,
          location: npc.location,
          lvl: npc.lvl,
          prof: npc.prof,
          type: npc.type,
          wt: npc.wt,
        },
        partyGathering: {
          notificationId,
          discordId,
          world,
        },
      });

      chatResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value?.data?.id) {
          setChatMessageId(guildIds[index], result.value.data.id);
        }
      });

      setNpcState(npc.id, {
        ...npc,
        notificationSent: true,
      });

      setOpen("party-finder", true);
    } catch (error) {
      console.error("Failed to gather party:", error);
      window.message("Nie udało się rozpocząć zbierania grupy");
    } finally {
      setIsGatheringPartyPending(false);
    }
  };

  return (
    <span key={npc.id}>
      <span
        className={cn("ll:flex ll:justify-between ll:py-2 ll:gap-4 ll:px-3")}
        style={{
          background:
            idx === 0
              ? getGradient(key, settingsByNpcType?.highlight)
              : getBackgroundColor(key, settingsByNpcType?.highlight),
        }}
      >
        <NpcTile npc={npc} />
        <span className="ll:flex ll:flex-col ll:gap-1 ll:flex-1">
          <span>
            <span className="ll:font-semibold">{npc.nick} </span>
            <span>
              ({npc.lvl}
              {npc.prof})
            </span>
          </span>
          <span className="ll:mb-2 ll:text-xs">
            {npc.location} ({npc.x}, {npc.y})
          </span>
          <span className="ll:flex ll:gap-1 ll:flex-wrap">
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
                  disabled={isGatheringPartyPending || hasActivePartyGathering}
                  onClick={() => handleGatherParty(npc)}
                >
                  {isGatheringPartyPending ? "..." : "Zbierz grupę"}
                </Button>
              </>
            )}
          </span>
        </span>
        {npcs.length > 1 && (
          <XIcon
            className={cn(
              "ll-custom-cursor-pointer ll:text-gray-300 ll:hover:text-gray-100 ll:transition-colors",
            )}
            size="16"
            onClick={() => handleRemoveNpc(npc.id)}
          />
        )}
      </span>

      {npcs.length > 1 && <Separator className="ll:bg-gray-600 ll:h-px" />}
    </span>
  );
};
