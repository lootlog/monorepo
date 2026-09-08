import { createApiClient } from "@lootlog/client/transport";
import type {
  CreateGroupFightDto,
  CreateGroupFightResponseDtoOutput,
} from "@lootlog/client/main";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import { GAME_EVENT_RETRY_OPTIONS } from "@/api/retry-policy";

export type CreateGroupFightOptions = CreateGroupFightDto;

export function createGroupFight(payload: CreateGroupFightOptions) {
  const client = createApiClient("main");
  return runSingleLoggedAction({
    actionType: "create_group_fight",
    actionPayload: {
      submissionKey: payload.submissionKey,
      participantCount: payload.participants.length,
    },
    request: { method: "POST", endpoint: "/group-fights", payload },
    execute: () =>
      client.post<CreateGroupFightResponseDtoOutput>("/group-fights", payload),
    retry: GAME_EVENT_RETRY_OPTIONS,
  });
}
