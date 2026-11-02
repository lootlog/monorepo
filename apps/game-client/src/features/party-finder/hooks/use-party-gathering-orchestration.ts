import { MessageType } from "@/api/chat.api";
import { ActivePartyGatheringError } from "@/features/party-finder/active-party-gathering-error";
import { NotificationChatPublishError } from "@/features/chat/hooks/use-notification-chat-orchestration";
import { useSendChatMessage } from "@/hooks/api/use-send-chat-message";
import {
  useMessagingControllerSendNotification,
  usePartyReadyRoomControllerCreate,
} from "@lootlog/client/main";

import { decodePartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import {
  getApiErrorStringDetail,
  getApiErrorStringField,
  isApiError,
} from "@lootlog/client/transport";
import { selectOwnedReadyRoom } from "@/features/party-finder/ready-room-cache";
import { readReadyRoomCache } from "@/features/party-finder/hooks/use-ready-rooms";
import {
  useReadyRoomsCache,
  useRefreshReadyRoom,
} from "@/features/party-finder/hooks/use-ready-rooms-cache";
import { useWindowsStore } from "@/store/windows.store";
import {
  buildNpcChatMessagePayload,
  buildNpcNotificationPayload,
} from "@/utils/notifications-and-detector/npc-notification";
import type { GameNpcWithLocation } from "@/store/npc-detector.store";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** A gathering belongs to one Lootlog, never several at once. */
type StartPartyGatheringOptions = {
  guildId: string;
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
  guildId: string;
  world: string;
};

type StartNpcNotificationOptions = {
  npc: GameNpcWithLocation;
  guildIds: string[];
  world: string;
};

type PublishedNotification = { notificationId: string; guildIds: string[] };

const getActivePartyGatheringNotificationId = (cause: unknown) => {
  if (!isApiError(cause) || cause.status !== 409) return undefined;
  const code = getApiErrorStringField(cause, "code");
  const notificationId = getApiErrorStringDetail(cause, "notificationId");

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
  const queryClient = useQueryClient();
  const { mergeProjection } = useReadyRoomsCache();
  const refreshReadyRoom = useRefreshReadyRoom();
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
    await refreshReadyRoom(notificationId);

    if (shouldOpen) openPartyFinder(closeCreateWindow);

    return notificationId;
  };

  /** One gathering per Discord user: an existing one is shown instead. */
  const rejectIfOwnedReadyRoom = (
    shouldOpen: boolean,
    closeCreateWindow = false,
  ) => {
    const ownedReadyRoom = selectOwnedReadyRoom(
      readReadyRoomCache(queryClient),
    );

    if (!ownedReadyRoom) return undefined;

    if (shouldOpen) openPartyFinder(closeCreateWindow);

    return Promise.reject(
      new ActivePartyGatheringError(ownedReadyRoom.notificationId),
    );
  };

  const startPartyGathering = ({
    guildId,
    world,
    description,
    minLvl,
    maxLvl,
    closeCreateWindow = false,
    openPartyFinder: shouldOpen = true,
  }: StartPartyGatheringOptions): Promise<
    PublishedNotification | undefined
  > => {
    const character = buildCurrentCharacterPayload();

    if (!character) return Promise.resolve(undefined);

    const ownedReadyRoomRejection = rejectIfOwnedReadyRoom(
      shouldOpen,
      closeCreateWindow,
    );

    if (ownedReadyRoomRejection) return ownedReadyRoomRejection;

    setIsCreatingPartyGathering(true);

    const createPartyGathering = async () => {
      let response: Awaited<ReturnType<typeof createPartyGatheringAsync>>;

      try {
        response = await createPartyGatheringAsync({
          data: {
            guildId,
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

      if (shouldOpen) openPartyFinder(closeCreateWindow);

      return {
        notificationId: projection.notificationId,
        guildIds: projection.guildIds,
      };
    };

    return createPartyGathering().finally(() =>
      setIsCreatingPartyGathering(false),
    );
  };

  const startNpcPartyGathering = ({
    npc,
    guildId,
    world,
    openPartyFinder: shouldOpen = true,
  }: StartNpcPartyGatheringOptions): Promise<
    PublishedNotification | undefined
  > => {
    const ownedReadyRoomRejection = rejectIfOwnedReadyRoom(shouldOpen);

    if (ownedReadyRoomRejection) return ownedReadyRoomRejection;

    const notificationPayload = buildNpcNotificationPayload({
      npc,
      guildIds: [guildId],
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

      await refreshReadyRoom(response.notificationId);

      if (shouldOpen) openPartyFinder();

      return {
        notificationId: response.notificationId,
        guildIds: response.guildIds ?? [guildId],
      };
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
    PublishedNotification | undefined
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

      await sendChatMessageAsync(chatMessageOptions).catch((cause: unknown) => {
        throw new NotificationChatPublishError(cause);
      });

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
