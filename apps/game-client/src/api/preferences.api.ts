import { getApiClient } from "@/lib/api-client";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import type {
  UpdateUserGameAccountPreferencesPayload,
  UpdateUserPreferencesPayload,
  UserGameAccountPreferences,
  UserPreferences,
} from "@lootlog/types";

type LootlogCharacterConfig = {
  userId: string;
  accountId: string;
  characterId: string;
  catchingGuildIds: string[];
};

export type LootlogCharacterConfigResponse = Record<
  string,
  LootlogCharacterConfig
>;

export type UpdateLootlogCharacterSettings = {
  characterId: string;
  catchingGuildIds: string[];
};

export async function fetchLootlogCharactersConfig(
  accountId: string,
): Promise<LootlogCharacterConfigResponse> {
  const client = getApiClient("default");
  const response = await client.get<LootlogCharacterConfigResponse>(
    `/users/@me/lootlog-config/accounts/${accountId}`,
    { withCredentials: true },
  );

  return response.data;
}

export async function updateLootlogCharactersConfig(
  accountId: string,
  options: UpdateLootlogCharacterSettings,
): Promise<unknown> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "update_lootlog_characters_config",
    actionPayload: {
      accountId,
      ...options,
    },
    request: {
      method: "PUT",
      endpoint: `/users/@me/lootlog-config/accounts/${accountId}`,
      payload: options,
    },
    execute: () =>
      client.put(`/users/@me/lootlog-config/accounts/${accountId}`, options),
  });

  return response.data;
}

export async function fetchUserPreferences(): Promise<UserPreferences> {
  const client = getApiClient("default");
  const response = await client.get<UserPreferences>("/users/@me/preferences");

  return response.data;
}

export async function updateUserPreferences(
  payload: UpdateUserPreferencesPayload,
): Promise<UserPreferences> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "update_user_preferences",
    actionPayload: payload,
    request: {
      method: "PATCH",
      endpoint: "/users/@me/preferences",
      payload,
    },
    execute: () =>
      client.patch<UserPreferences>("/users/@me/preferences", payload),
  });

  return response.data;
}

export async function fetchUserGameAccountPreferences(
  accountId: string,
): Promise<UserGameAccountPreferences> {
  const client = getApiClient("default");
  const response = await client.get<UserGameAccountPreferences>(
    `/users/@me/game-preferences/accounts/${accountId}`,
  );

  return response.data;
}

export async function updateUserGameAccountPreferences(
  accountId: string,
  payload: UpdateUserGameAccountPreferencesPayload,
): Promise<UserGameAccountPreferences> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "update_user_game_account_preferences",
    actionPayload: {
      accountId,
      ...payload,
    },
    request: {
      method: "PATCH",
      endpoint: `/users/@me/game-preferences/accounts/${accountId}`,
      payload,
    },
    execute: () =>
      client.patch<UserGameAccountPreferences>(
        `/users/@me/game-preferences/accounts/${accountId}`,
        payload,
      ),
  });

  return response.data;
}
