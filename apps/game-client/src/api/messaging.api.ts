import { Game } from "@/lib/game";
import i18n from "@/i18n/config";
import { getApiClient } from "@/lib/api-client";
import {
  runLoggedRequest,
  runSingleLoggedAction,
  type LoggedActionController,
} from "@/lib/logs/log-actions";
import type { Npc } from "@/utils/game/get-battle-participants";
import type { PartyGatheringSession } from "@/store/party-finder.store";

type MessagingCharacter = {
  lvl: number;
  nick: string;
  accountId: string;
  characterId: string;
  prof: string;
  icon: string;
  clan?: {
    id: number;
    name: string;
  };
};

const getCurrentCharacterPayload = (): MessagingCharacter => {
  const hero = Game.hero;

  return {
    lvl: hero.lvl,
    nick: hero.nick,
    accountId: String(hero.account),
    characterId: String(hero.id),
    prof: hero.prof,
    icon: hero.img,
    clan: hero.clan ? { id: hero.clan.id, name: hero.clan.name } : undefined,
  };
};

export type CreateNotificationOptions = {
  npc?: Npc & {
    x?: number;
    y?: number;
  };
  guildIds: string[];
  world: string;
  message?: string;
  isGatheringParty?: boolean;
};

export type CreateNotificationResponse = {
  notificationId: string;
  guildIds?: string[];
};

export async function createNotification(
  options: CreateNotificationOptions,
): Promise<CreateNotificationResponse> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "create_notification",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: "/messaging",
      payload: options,
    },
    execute: () =>
      client.post<CreateNotificationResponse>("/messaging", options),
  });

  return response.data;
}

export type CreatePartyGatheringOptions = {
  guildIds: string[];
  description?: string;
  minLvl?: number;
  maxLvl?: number;
};

export type CreatePartyGatheringResponse = {
  notificationId: string;
  guildIds?: string[];
};

export async function createPartyGathering(
  options: CreatePartyGatheringOptions,
): Promise<CreatePartyGatheringResponse> {
  const client = getApiClient("default");
  const payload = {
    guildIds: options.guildIds,
    world: Game.getWorldName(),
    character: getCurrentCharacterPayload(),
    description: options.description,
    minLvl: options.minLvl,
    maxLvl: options.maxLvl,
  };

  const response = await runSingleLoggedAction({
    actionType: "create_party_gathering",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: "/messaging/party-gathering",
      payload,
    },
    execute: () =>
      client.post<CreatePartyGatheringResponse>(
        "/messaging/party-gathering",
        payload,
      ),
  });

  return response.data;
}

type CancelPartyGatheringResponse = {
  success: boolean;
  guildIds: string[];
};

export type CancelPartyGatheringResult = CancelPartyGatheringResponse & {
  requestSummary: {
    totalRequests: number;
    successCount: number;
    failureCount: number;
  };
};

type CancelPartyGatheringOptions = {
  partyGathering: PartyGatheringSession;
  chatMessageIds: Record<string, string>;
  action: LoggedActionController;
};

const PARTY_GATHERING_ENDPOINT = "/messaging/party-gathering";

const getPartyGatheringCancellationPath = (
  notificationId: string | undefined,
) =>
  notificationId
    ? `${PARTY_GATHERING_ENDPOINT}/${notificationId}`
    : PARTY_GATHERING_ENDPOINT;

export async function cancelPartyGathering({
  partyGathering,
  chatMessageIds,
  action,
}: CancelPartyGatheringOptions): Promise<CancelPartyGatheringResult> {
  const client = getApiClient("default");
  const deleteEndpoint = getPartyGatheringCancellationPath(
    partyGathering.notificationId,
  );
  const response = await runLoggedRequest({
    action,
    method: "DELETE",
    endpoint: deleteEndpoint,
    payload: {
      notificationId: partyGathering.notificationId,
    },
    request: () => client.delete<CancelPartyGatheringResponse>(deleteEndpoint),
  });
  const responseData = response.data ?? { success: true, guildIds: [] };
  const canceledGuildIds = new Set(responseData.guildIds);
  const heroNick = Game.hero.nick;

  const updateMessagePromises = Object.entries(chatMessageIds).map(
    ([guildId, messageId]) => {
      if (!canceledGuildIds.has(guildId)) {
        return Promise.resolve();
      }

      const endpoint = `/guilds/${guildId}/chat-messages/${messageId}`;
      const payload = {
        message: i18n.t("party-finder.messages.endedChatMessage", { heroNick }),
      };

      return runLoggedRequest({
        action,
        method: "PATCH",
        endpoint,
        payload,
        request: () => client.patch(endpoint, payload),
      })
        .then(() => ({ status: "fulfilled" as const }))
        .catch((error) => {
          console.warn(
            `Failed to update chat message in guild ${guildId}:`,
            error,
          );

          return { status: "rejected" as const };
        });
    },
  );

  const updateMessageResults = await Promise.all(updateMessagePromises);
  const successfulMessageUpdates = updateMessageResults.filter(
    (result) => result?.status === "fulfilled",
  ).length;
  const failedMessageUpdates = updateMessageResults.filter(
    (result) => result?.status === "rejected",
  ).length;
  const attemptedMessageUpdates =
    successfulMessageUpdates + failedMessageUpdates;

  return {
    ...responseData,
    requestSummary: {
      totalRequests: 1 + attemptedMessageUpdates,
      successCount: 1 + successfulMessageUpdates,
      failureCount: failedMessageUpdates,
    },
  };
}

export type VolunteerOptions = {
  notificationId: string;
  targetDiscordId: string;
  world: string;
};

export async function volunteer(options: VolunteerOptions): Promise<unknown> {
  const client = getApiClient("default");
  const payload = {
    world: options.world,
    targetDiscordId: options.targetDiscordId,
    character: getCurrentCharacterPayload(),
  };
  const response = await runSingleLoggedAction({
    actionType: "volunteer",
    actionPayload: options,
    request: {
      method: "POST",
      endpoint: `/messaging/${options.notificationId}/volunteer`,
      payload,
    },
    execute: () =>
      client.post(`/messaging/${options.notificationId}/volunteer`, payload),
  });

  return response.data;
}
