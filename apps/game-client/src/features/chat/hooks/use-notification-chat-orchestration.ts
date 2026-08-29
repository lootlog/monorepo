import { useMessagingControllerSendNotification } from "@lootlog/api-client/react-query/main/messaging";
import { isApiError } from "@lootlog/api-client/transport";
import { useState } from "react";

type StartNotificationMessageOptions<TResult> = {
  guildIds: string[];
  world: string;
  message: string;
  sendChatMessage: (guildIds: string[]) => Promise<TResult>;
};

export const useNotificationChatOrchestration = () => {
  const { mutateAsync: createNotificationAsync } =
    useMessagingControllerSendNotification();
  const [isCreatingNotificationMessage, setIsCreatingNotificationMessage] =
    useState(false);

  const startNotificationMessage = async <TResult>({
    guildIds,
    world,
    message,
    sendChatMessage,
  }: StartNotificationMessageOptions<TResult>) => {
    setIsCreatingNotificationMessage(true);

    try {
      const response = await createNotificationAsync({
        data: {
          guildIds,
          message,
          world,
        },
      });
      const resolvedGuildIds = response.guildIds ?? guildIds;
      const result = await sendChatMessage(resolvedGuildIds);

      return {
        guildIds: resolvedGuildIds,
        notificationId: response.notificationId,
        result,
      };
    } finally {
      setIsCreatingNotificationMessage(false);
    }
  };

  return {
    isCreatingNotificationMessage,
    startNotificationMessage,
  };
};

export const isNotificationRateLimitError = (error: unknown): boolean =>
  isApiError(error) && error.status === 429;
