import {
  messagingControllerSendNotification,
  type CreateNotificationDto,
  type NotificationResponseDtoOutput,
} from "@lootlog/client/main";

import { runSingleLoggedAction } from "@/lib/logs/log-actions";

export type CreateNotificationOptions = CreateNotificationDto;

export type CreateNotificationResponse = NotificationResponseDtoOutput;

export function createNotification(
  options: CreateNotificationOptions,
): Promise<CreateNotificationResponse> {
  return runSingleLoggedAction({
    actionType: "create_notification",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: "/messaging",
      payload: options,
    },
    execute: () => messagingControllerSendNotification(options),
  });
}
