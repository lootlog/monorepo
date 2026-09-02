import { MessageType, type SendChatMessageOptions } from "@/api/chat.api";
import { ActivePartyGatheringError } from "@/features/party-finder/active-party-gathering-error";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import {
  useMessagingControllerSendNotification,
  partyReadyRoomControllerGet,
  usePartyReadyRoomControllerCreate,
} from "@lootlog/client/main";

import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import {
  buildChatCharacterData,
  buildCurrentCharacterPayload,
} from "@/lib/api/generated-helpers";
import { isApiError } from "@lootlog/client/transport";
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

  const startPartyGathering = ({
    guildIds,
    world,
    description,
    minLvl,
    maxLvl,
    closeCreateWindow = false,
  }: StartPartyGatheringOptions): Promise<
    Awaited<ReturnType<typeof finalizePartyGathering>> | undefined
  > => {
    const character = buildCurrentCharacterPayload();
    const characterData = buildChatCharacterData();
    if (!character || !characterData) return Promise.resolve(undefined);

    const ownedReadyRoom = selectOwnedReadyRoom(usePartyFinderStore.getState());
    if (ownedReadyRoom) {
      openPartyFinder(closeCreateWindow);
      return Promise.reject(
        new ActivePartyGatheringError(ownedReadyRoom.notificationId),
      );
    }

    setIsCreatingPartyGathering(true);

    const createPartyGathering = async () => {
      let response: Awaited<ReturnType<typeof createPartyGatheringAsync>>;
      try {
        response = await createPartyGatheringAsync({
          data: {
            guildIds,
            world,
            character,
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
          characterData,
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
    };

    return createPartyGathering().finally(() =>
      setIsCreatingPartyGathering(false),
    );
  };

  const startNpcPartyGathering = ({
    npc,
    guildIds,
    world,
  }: StartNpcPartyGatheringOptions): Promise<
    Awaited<ReturnType<typeof finalizePartyGathering>> | undefined
  > => {
    const notificationPayload = buildNpcNotificationPayload({
      npc,
      guildIds,
      world,
      isGatheringParty: true,
    });
    if (!notificationPayload) return Promise.resolve(undefined);

    setIsCreatingNpcPartyGathering(true);

    const createNpcPartyGathering = async () => {
      const response = await createNotificationAsync({
        data: notificationPayload,
      });
      const resolvedGuildIds = response.guildIds ?? guildIds;
      const projection = (await partyReadyRoomControllerGet({
        notificationId: response.notificationId,
      })) as unknown as PartyReadyRoomProjection;
      mergeProjection(projection);

      const chatMessageOptions = buildNpcChatMessagePayload({
        npc,
        guildIds: resolvedGuildIds,
        messageType: MessageType.PARTY_GATHERING,
        message: `${npc.nick} (${npc.lvl}${npc.prof ?? ""})`,
        partyGathering: {
          notificationId: response.notificationId,
          discordId: projection.organizerDiscordId,
          world,
        },
      });
      if (!chatMessageOptions) return;

      return await finalizePartyGathering({
        notificationId: response.notificationId,
        guildIds: resolvedGuildIds,
        chatMessageOptions,
      });
    };

    return createNpcPartyGathering().finally(() =>
      setIsCreatingNpcPartyGathering(false),
    );
  };

  const startNpcNotification = ({
    npc,
    guildIds,
    world,
  }: StartNpcNotificationOptions): Promise<
    { notificationId: string; guildIds: string[] } | undefined
  > => {
    setIsSendingNpcNotification(true);

    const sendNpcNotification = async () => {
      const response = await createNotificationAsync({
        data: buildNpcNotificationPayload({
          npc,
          guildIds,
          world,
        }),
      });
      const resolvedGuildIds = response.guildIds ?? guildIds;

      const chatMessageOptions = buildNpcChatMessagePayload({
        npc,
        guildIds: resolvedGuildIds,
        messageType: MessageType.NPC,
      });
      if (!chatMessageOptions) return;

      await sendChatMessageAsync(chatMessageOptions);

      return {
        notificationId: response.notificationId,
        guildIds: resolvedGuildIds,
      };
    };

    return sendNpcNotification().finally(() =>
      setIsSendingNpcNotification(false),
    );
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
