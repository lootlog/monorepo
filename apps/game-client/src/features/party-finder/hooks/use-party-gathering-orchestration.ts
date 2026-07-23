import { MessageType, type SendChatMessageOptions } from "@/api/chat.api";
import { ActivePartyGatheringError } from "@/features/party-finder/active-party-gathering-error";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
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
import { isApiError } from "@/lib/api-client";
import { useGameStore } from "@/store/game.store";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
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

const getActivePartyGatheringNotificationId = (error: unknown) => {
  if (
    !isApiError(error) ||
    error.status !== 409 ||
    typeof error.data !== "object" ||
    error.data === null
  ) {
    return undefined;
  }

  const { code, notificationId } = error.data as Record<string, unknown>;
  return code === "ACTIVE_GATHERING_EXISTS" &&
    typeof notificationId === "string"
    ? notificationId
    : undefined;
};

export const usePartyGatheringOrchestration = () => {
  const heroName = useGameStore((state) => state.game?.hero.name ?? "");
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
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const setOpen = useWindowsStore((state) => state.setOpen);

  const openPartyFinder = (closeCreateWindow = false) => {
    if (closeCreateWindow) {
      setOpen("create-party-gathering", false);
    }
    setOpen("party-finder", true);
  };

  const finalizePartyGathering = async ({
    notificationId,
    guildIds,
    closeCreateWindow,
    chatMessageOptions,
  }: FinalizePartyGatheringOptions) => {
    openPartyFinder(closeCreateWindow);

    try {
      await sendChatMessageAsync(chatMessageOptions);
    } catch {
      // The Ready Room is already committed and remains the source of truth.
    }

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
    const ownedReadyRoom = selectOwnedReadyRoom(usePartyFinderStore.getState());
    if (ownedReadyRoom) {
      openPartyFinder(closeCreateWindow);
      throw new ActivePartyGatheringError(ownedReadyRoom.notificationId);
    }

    setIsCreatingPartyGathering(true);

    try {
      let response: Awaited<ReturnType<typeof createPartyGatheringAsync>>;
      try {
        response = await createPartyGatheringAsync({
          data: {
            guildIds,
            world,
            character: buildCurrentCharacterPayload(),
            description,
            minLvl,
            maxLvl,
          },
        });
      } catch (error) {
        const notificationId = getActivePartyGatheringNotificationId(error);
        if (notificationId) {
          const existingProjection = (await partyReadyRoomControllerGet({
            notificationId,
          })) as unknown as PartyReadyRoomProjection;
          mergeProjection(existingProjection);
          openPartyFinder(closeCreateWindow);
        }
        throw error;
      }
      const projection = response as unknown as PartyReadyRoomProjection;
      mergeProjection(projection);
      const resolvedGuildIds = projection.guildIds;

      return await finalizePartyGathering({
        notificationId: projection.notificationId,
        guildIds: resolvedGuildIds,
        closeCreateWindow,
        chatMessageOptions: {
          message: heroName,
          guildIds: resolvedGuildIds,
          type: MessageType.PARTY_GATHERING,
          characterData: buildChatCharacterData(),
          partyGathering: {
            notificationId: projection.notificationId,
            discordId: projection.organizerDiscordId,
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
            discordId: projection.organizerDiscordId,
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

export type PartyGatheringOrchestration = ReturnType<
  typeof usePartyGatheringOrchestration
>;
