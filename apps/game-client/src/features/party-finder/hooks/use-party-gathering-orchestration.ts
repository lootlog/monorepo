import { MessageType } from "@/api/chat.api";
import { ActivePartyGatheringError } from "@/features/party-finder/active-party-gathering-error";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import {
  useMessagingControllerSendNotification,
  partyReadyRoomControllerGet,
  usePartyReadyRoomControllerCreate,
} from "@lootlog/client/main";

import { decodePartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import { getApiErrorStringField, isApiError } from "@lootlog/client/transport";
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
  openPartyFinder?: boolean;
};

type StartNpcPartyGatheringOptions = {
  openPartyFinder?: boolean;
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
  openPartyFinder?: boolean;
};

const getActivePartyGatheringNotificationId = (cause: unknown) => {
  if (!isApiError(cause) || cause.status !== 409) return undefined;
  const code = getApiErrorStringField(cause, "code");
  const notificationId = getApiErrorStringField(cause, "notificationId");
  return code === "ACTIVE_GATHERING_EXISTS" ? notificationId : undefined;
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
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const setOpen = useWindowsStore((state) => state.setOpen);

  const openPartyFinder = (closeCreateWindow = false) => {
    if (closeCreateWindow) {
      setOpen("create-party-gathering", false);
    }
    setOpen("party-finder", true);
  };

  const recoverActiveGathering = async (
    cause: unknown,
    shouldOpen: boolean,
    closeCreateWindow = false,
  ) => {
    const notificationId = getActivePartyGatheringNotificationId(cause);
    if (!notificationId) return;
    mergeProjection(
      decodePartyReadyRoomProjection(
        await partyReadyRoomControllerGet({ notificationId }),
      ),
    );
    if (shouldOpen) openPartyFinder(closeCreateWindow);
    return notificationId;
  };

  const finalizePartyGathering = ({
    notificationId,
    guildIds,
    closeCreateWindow,
    openPartyFinder: shouldOpen = true,
  }: FinalizePartyGatheringOptions) => {
    if (shouldOpen) openPartyFinder(closeCreateWindow);

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
    openPartyFinder: shouldOpen = true,
  }: StartPartyGatheringOptions): Promise<
    ReturnType<typeof finalizePartyGathering> | undefined
  > => {
    const character = buildCurrentCharacterPayload();
    if (!character) return Promise.resolve(undefined);

    const ownedReadyRoom = selectOwnedReadyRoom(usePartyFinderStore.getState());
    if (ownedReadyRoom) {
      if (shouldOpen) openPartyFinder(closeCreateWindow);
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
        await recoverActiveGathering(error, shouldOpen, closeCreateWindow);
        throw error;
      }
      const projection = decodePartyReadyRoomProjection(response);
      mergeProjection(projection);
      const resolvedGuildIds = projection.guildIds;

      return finalizePartyGathering({
        notificationId: projection.notificationId,
        guildIds: resolvedGuildIds,
        closeCreateWindow,
        openPartyFinder: shouldOpen,
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
    openPartyFinder: shouldOpen = true,
  }: StartNpcPartyGatheringOptions): Promise<
    ReturnType<typeof finalizePartyGathering> | undefined
  > => {
    const ownedReadyRoom = selectOwnedReadyRoom(usePartyFinderStore.getState());
    if (ownedReadyRoom) {
      if (shouldOpen) openPartyFinder();
      return Promise.reject(
        new ActivePartyGatheringError(ownedReadyRoom.notificationId),
      );
    }
    const notificationPayload = buildNpcNotificationPayload({
      npc,
      guildIds,
      world,
      isGatheringParty: true,
    });
    if (!notificationPayload) return Promise.resolve(undefined);

    setIsCreatingNpcPartyGathering(true);

    const createNpcPartyGathering = async () => {
      let response: Awaited<ReturnType<typeof createNotificationAsync>>;
      try {
        response = await createNotificationAsync({ data: notificationPayload });
      } catch (error) {
        const notificationId = await recoverActiveGathering(error, shouldOpen);
        if (notificationId) throw new ActivePartyGatheringError(notificationId);
        throw error;
      }
      const resolvedGuildIds = response.guildIds ?? guildIds;
      const projection = decodePartyReadyRoomProjection(
        await partyReadyRoomControllerGet({
          notificationId: response.notificationId,
        }),
      );
      mergeProjection(projection);

      return finalizePartyGathering({
        notificationId: response.notificationId,
        guildIds: resolvedGuildIds,
        openPartyFinder: shouldOpen,
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
        world,
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
