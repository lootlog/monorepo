import { MessageType, type SendChatMessageOptions } from "@/api/chat.api";
import { useSilentCancelPartyGathering } from "@/hooks/api/use-silent-cancel-party-gathering";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import { useSession } from "@/hooks/auth/use-session";
import {
  useMessagingControllerCreatePartyGathering,
  useMessagingControllerSendNotification,
} from "@/lib/api/generated/main/messaging/messaging";
import {
  buildChatCharacterData,
  buildCurrentCharacterPayload,
} from "@/lib/api/generated-helpers";
import { Game } from "@/lib/game";
import { usePartyFinderStore } from "@/store/party-finder.store";
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
  world: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
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
    useMessagingControllerCreatePartyGathering();
  const { mutateAsync: createNotificationAsync } =
    useMessagingControllerSendNotification();
  const { mutateAsync: sendChatMessageAsync } = useSendChatMessage();
  const { data: session } = useSession();
  const discordId = session?.user?.discordId ?? "";
  const setNotification = usePartyFinderStore((state) => state.setNotification);
  const setPartyGathering = usePartyFinderStore(
    (state) => state.setPartyGathering,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const silentCancel = useSilentCancelPartyGathering();

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
    world,
    description,
    minLvl,
    maxLvl,
    closeCreateWindow,
    chatMessageOptions,
  }: FinalizePartyGatheringOptions) => {
    setPartyGathering({
      notificationId,
      discordId,
      character: buildCurrentCharacterPayload(),
      description,
      minLvl,
      maxLvl,
      world,
      createdAt: new Date().toISOString(),
      guildIds,
    });

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
      await silentCancel();

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
      const resolvedGuildIds = response.guildIds ?? guildIds;

      return await finalizePartyGathering({
        notificationId: response.notificationId,
        guildIds: resolvedGuildIds,
        world,
        description,
        minLvl,
        maxLvl,
        closeCreateWindow,
        chatMessageOptions: {
          message: Game.hero.nick,
          guildIds: resolvedGuildIds,
          type: MessageType.PARTY_GATHERING,
          characterData: buildChatCharacterData(),
          partyGathering: {
            notificationId: response.notificationId,
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
      await silentCancel();

      const response = await createNotificationAsync({
        data: buildNpcNotificationPayload({
          npc,
          guildIds,
          world,
          isGatheringParty: true,
        }),
      });
      const resolvedGuildIds = response.guildIds ?? guildIds;

      return await finalizePartyGathering({
        notificationId: response.notificationId,
        guildIds: resolvedGuildIds,
        world,
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
