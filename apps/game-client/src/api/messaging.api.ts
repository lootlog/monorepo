import {
  messagingControllerSendNotification,
  messagingControllerVolunteer,
} from "@/lib/api/generated/main/messaging/messaging";
import type {
  CreateNotificationDto,
  CreateVolunteerDto,
  NotificationResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
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

export type VolunteerOptions = Omit<CreateVolunteerDto, "character"> & {
  notificationId: string;
};

export async function volunteer(options: VolunteerOptions): Promise<void> {
  const character = buildCurrentCharacterPayload();
  if (!character) return;

  const payload: CreateVolunteerDto = {
    world: options.world,
    targetDiscordId: options.targetDiscordId,
    character,
  };

  await runSingleLoggedAction({
    actionType: "volunteer",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: `/messaging/${options.notificationId}/volunteer`,
      payload,
    },
    execute: () =>
      messagingControllerVolunteer(
        { notificationId: options.notificationId },
        payload,
      ),
  });
}
