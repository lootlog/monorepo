import { useMessagingControllerSendNotification } from "@lootlog/client/main";
import { isApiError } from "@lootlog/client/transport";
import { useState } from "react";

type StartNotificationMessageOptions<TResult> = {
  guildIds: string[];
  world: string;
  message: string;
  sendChatMessage: (guildIds: string[]) => Promise<TResult>;
};

export class NotificationChatPublishError extends Error {
  constructor(cause: unknown) {
    super("Notification delivered, chat publishing failed", { cause });
    this.name = "NotificationChatPublishError";
  }
}

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
      const result = await sendChatMessage(resolvedGuildIds).catch(
        (cause: unknown) => {
          throw new NotificationChatPublishError(cause);
        },
      );

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

export const isNotificationRateLimitError = (cause: unknown): boolean =>
  isApiError(cause) && cause.status === 429;
