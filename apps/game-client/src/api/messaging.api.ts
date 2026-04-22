import {
  messagingControllerCancelPartyGathering,
  messagingControllerCancelPartyGatheringByUser,
  messagingControllerCreatePartyGathering,
  messagingControllerSendNotification,
  messagingControllerVolunteer,
} from "@/lib/api/generated/main/messaging/messaging";
import type {
  CancelPartyGatheringResponseDtoOutput,
  CreateNotificationDto,
  CreatePartyGatheringDto,
  CreateVolunteerDto,
  NotificationResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { buildCurrentCharacterPayload } from "@/lib/api/generated-helpers";
import {
  runLoggedRequest,
  runSingleLoggedAction,
  type LoggedActionController,
} from "@/lib/logs/log-actions";
import type { PartyGatheringSession } from "@/store/party-finder.store";
import { Game } from "@/lib/game";

export type CreateNotificationOptions = CreateNotificationDto;
export type CreateNotificationResponse = NotificationResponseDtoOutput;

export async function createNotification(
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

export type CreatePartyGatheringOptions = Omit<
  CreatePartyGatheringDto,
  "world" | "character"
>;

export type CreatePartyGatheringResponse = NotificationResponseDtoOutput;

export async function createPartyGathering(
  options: CreatePartyGatheringOptions,
): Promise<CreatePartyGatheringResponse> {
  const payload: CreatePartyGatheringDto = {
    guildIds: options.guildIds,
    world: Game.getWorldName(),
    character: buildCurrentCharacterPayload(),
    description: options.description,
    minLvl: options.minLvl,
    maxLvl: options.maxLvl,
  };

  return runSingleLoggedAction({
    actionType: "create_party_gathering",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: "/messaging/party-gathering",
      payload,
    },
    execute: () => messagingControllerCreatePartyGathering(payload),
  });
}

export type CancelPartyGatheringResult =
  CancelPartyGatheringResponseDtoOutput & {
    requestSummary: {
      totalRequests: number;
      successCount: number;
      failureCount: number;
    };
  };

type CancelPartyGatheringOptions = {
  partyGathering: PartyGatheringSession;
  action: LoggedActionController;
};

export async function cancelPartyGathering({
  partyGathering,
  action,
}: CancelPartyGatheringOptions): Promise<CancelPartyGatheringResult> {
  const responseData = await runLoggedRequest({
    action,
    method: "DELETE",
    endpoint: partyGathering.notificationId
      ? `/messaging/party-gathering/${partyGathering.notificationId}`
      : "/messaging/party-gathering",
    payload: {
      notificationId: partyGathering.notificationId,
    },
    request: () =>
      partyGathering.notificationId
        ? messagingControllerCancelPartyGathering({
            notificationId: partyGathering.notificationId,
          })
        : messagingControllerCancelPartyGatheringByUser(),
  });
  const normalizedResponseData = responseData ?? {
    success: true,
    guildIds: [],
  };

  return {
    ...normalizedResponseData,
    requestSummary: {
      totalRequests: 1,
      successCount: 1,
      failureCount: 0,
    },
  };
}

export type VolunteerOptions = Omit<CreateVolunteerDto, "character"> & {
  notificationId: string;
};

export async function volunteer(options: VolunteerOptions): Promise<void> {
  const payload: CreateVolunteerDto = {
    world: options.world,
    targetDiscordId: options.targetDiscordId,
    character: buildCurrentCharacterPayload(),
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
