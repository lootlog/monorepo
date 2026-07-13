import { MessageType, type SendChatMessageOptions } from "@/api/chat.api";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { useSession } from "@/hooks/auth/use-session";
import { useMessagingControllerSendNotification } from "@/lib/api/generated/main/messaging/messaging";
import {
  partyReadyRoomControllerGet,
  usePartyReadyRoomControllerCreate,
} from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import {
  buildChatCharacterData,
  buildCurrentCharacterPayload,
} from "@/lib/api/generated-helpers";
import { Game } from "@/lib/game";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useNotificationVolunteersStore } from "@/store/notification-volunteers.store";
import { useWindowsStore } from "@/store/windows.store";
import {
  buildNpcChatMessagePayload,
  buildNpcNotificationPayload,
} from "@/utils/notifications-and-detector/npc-notification";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import { useState } from "react";

type StartPartyGatheringOptions = {
  guildIds: string[];
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  closeCreateWindow?: boolean;
};

type StartNpcPartyGatheringOptions = {
  npc: GameNpcWithLocation;
  guildIds: string[];
  world: string;
};

type StartNpcNotificationOptions = {
  npc: GameNpcWithLocation;
  guildIds: string[];
  world: string;
};

type FinalizePartyGatheringOptions = {
  notificationId: string;
  guildIds: string[];
  closeCreateWindow?: boolean;
  chatMessageOptions: SendChatMessageOptions;
};

export const usePartyGatheringOrchestration = () => {
  const [isCreatingPartyGathering, setIsCreatingPartyGathering] =
    useState(false);
  const [isCreatingNpcPartyGathering, setIsCreatingNpcPartyGathering] =
    useState(false);
  const [isSendingNpcNotification, setIsSendingNpcNotification] =
    useState(false);
  const { mutateAsync: createPartyGatheringAsync } =
    usePartyReadyRoomControllerCreate();
  const { mutateAsync: createNotificationAsync } =
    useMessagingControllerSendNotification();
  const { mutateAsync: sendChatMessageAsync } = useSendChatMessage();
  const { data: session } = useSession();
  const discordId = session?.user?.discordId ?? "";
  const setNotification = useNotificationVolunteersStore(
    (state) => state.setNotification,
  );
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const setOpen = useWindowsStore((state) => state.setOpen);

  const setNpcNotificationState = (
    notificationId: string,
    npc: GameNpcWithLocation,
    world: string,
  ) => {
    setNotification(notificationId, {
      id: npc.id,
      name: npc.nick,
      lvl: npc.lvl,
      prof: npc.prof,
      location: npc.location,
      world,
      icon: npc.icon,
      x: npc.x,
      y: npc.y,
    });
  };

  const finalizePartyGathering = async ({
    notificationId,
    guildIds,
    closeCreateWindow,
    chatMessageOptions,
  }: FinalizePartyGatheringOptions) => {
    await sendChatMessageAsync(chatMessageOptions);

    if (closeCreateWindow) {
      setOpen("create-party-gathering", false);
    }

    setOpen("party-finder", true);

    return {
      notificationId,
      guildIds,
    };
  };

  const startPartyGathering = async ({
    guildIds,
    world,
    description,
    minLvl,
    maxLvl,
    closeCreateWindow = false,
  }: StartPartyGatheringOptions) => {
    setIsCreatingPartyGathering(true);

    try {
      const response = await createPartyGatheringAsync({
        data: {
          guildIds,
          world,
          character: buildCurrentCharacterPayload(),
          description,
          minLvl,
          maxLvl,
        },
      });
      const projection = response as unknown as PartyReadyRoomProjection;
      mergeProjection(projection);
      const resolvedGuildIds = projection.guildIds;

      return await finalizePartyGathering({
        notificationId: projection.notificationId,
        guildIds: resolvedGuildIds,
        closeCreateWindow,
        chatMessageOptions: {
          message: Game.hero.nick,
          guildIds: resolvedGuildIds,
          type: MessageType.PARTY_GATHERING,
          characterData: buildChatCharacterData(),
          partyGathering: {
            notificationId: projection.notificationId,
            discordId,
            description,
            minLvl,
            maxLvl,
            world,
          },
        },
      });
    } finally {
      setIsCreatingPartyGathering(false);
    }
  };

  const startNpcPartyGathering = async ({
    npc,
    guildIds,
    world,
  }: StartNpcPartyGatheringOptions) => {
    setIsCreatingNpcPartyGathering(true);

    try {
      const response = await createNotificationAsync({
        data: buildNpcNotificationPayload({
          npc,
          guildIds,
          world,
          isGatheringParty: true,
        }),
      });
      const resolvedGuildIds = response.guildIds ?? guildIds;
      const projection = (await partyReadyRoomControllerGet({
        notificationId: response.notificationId,
      })) as unknown as PartyReadyRoomProjection;
      mergeProjection(projection);

      return await finalizePartyGathering({
        notificationId: response.notificationId,
        guildIds: resolvedGuildIds,
        chatMessageOptions: buildNpcChatMessagePayload({
          npc,
          guildIds: resolvedGuildIds,
          messageType: MessageType.PARTY_GATHERING,
          message: `${npc.nick} (${npc.lvl}${npc.prof ?? ""})`,
          partyGathering: {
            notificationId: response.notificationId,
            discordId,
            world,
          },
        }),
      });
    } finally {
      setIsCreatingNpcPartyGathering(false);
    }
  };

  const startNpcNotification = async ({
    npc,
    guildIds,
    world,
  }: StartNpcNotificationOptions) => {
    setIsSendingNpcNotification(true);

    try {
      const response = await createNotificationAsync({
        data: buildNpcNotificationPayload({
          npc,
          guildIds,
          world,
        }),
      });
      const resolvedGuildIds = response.guildIds ?? guildIds;

      setNpcNotificationState(response.notificationId, npc, world);

      await sendChatMessageAsync(
        buildNpcChatMessagePayload({
          npc,
          guildIds: resolvedGuildIds,
          messageType: MessageType.NPC,
        }),
      );

      return {
        notificationId: response.notificationId,
        guildIds: resolvedGuildIds,
      };
    } finally {
      setIsSendingNpcNotification(false);
    }
  };

  return {
    isCreatingPartyGathering,
    isCreatingNpcPartyGathering,
    isSendingNpcNotification,
    startPartyGathering,
    startNpcNotification,
    startNpcPartyGathering,
  };
};
