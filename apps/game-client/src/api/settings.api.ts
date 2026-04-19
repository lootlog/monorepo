import { getApiClient } from "@/lib/api-client";
import { runSingleLoggedAction } from "@/lib/logs/log-actions";
import type {
  MigrateTimerSettingsPayload,
  UpdateGuildTimerSettingsPayload,
  UpdateSoundSettingsPayload,
  UpdateTimerSettingsPayload,
  UserGuildTimerSettings,
  UserSoundSettings,
  UserTimerSettings,
} from "@lootlog/types";

export async function fetchSoundSettings(): Promise<UserSoundSettings> {
  const client = getApiClient("default");
  const response = await client.get<UserSoundSettings>("/sound-settings");

  return response.data;
}

export async function updateSoundSettings(
  payload: UpdateSoundSettingsPayload,
): Promise<UserSoundSettings> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "update_sound_settings",
    actionPayload: payload,
    request: {
      method: "PATCH",
      endpoint: "/sound-settings",
      payload,
    },
    execute: () => client.patch<UserSoundSettings>("/sound-settings", payload),
  });

  return response.data;
}

export async function fetchTimerSettings(): Promise<UserTimerSettings> {
  const client = getApiClient("default");
  const response = await client.get<UserTimerSettings>("/timer-settings");

  return response.data;
}

export async function updateTimerSettings(
  payload: UpdateTimerSettingsPayload,
): Promise<UserTimerSettings> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "update_timer_settings",
    actionPayload: payload,
    request: {
      method: "PATCH",
      endpoint: "/timer-settings",
      payload,
    },
    execute: () => client.patch<UserTimerSettings>("/timer-settings", payload),
  });

  return response.data;
}

export async function fetchGuildTimerSettings(
  guildId: string,
): Promise<UserGuildTimerSettings> {
  const client = getApiClient("default");
  const response = await client.get<UserGuildTimerSettings>(
    `/timer-settings/guilds/${guildId}`,
  );

  return response.data;
}

export async function updateGuildTimerSettings(
  guildId: string,
  payload: UpdateGuildTimerSettingsPayload,
): Promise<UserGuildTimerSettings> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "update_guild_timer_settings",
    actionPayload: {
      guildId,
      ...payload,
    },
    request: {
      method: "PATCH",
      endpoint: `/timer-settings/guilds/${guildId}`,
      payload,
    },
    execute: () =>
      client.patch<UserGuildTimerSettings>(
        `/timer-settings/guilds/${guildId}`,
        payload,
      ),
  });

  return response.data;
}

export async function migrateTimerSettings(
  payload: MigrateTimerSettingsPayload,
): Promise<unknown> {
  const client = getApiClient("default");
  const response = await runSingleLoggedAction({
    actionType: "migrate_timer_settings",
    actionPayload: payload,
    request: {
      method: "POST",
      endpoint: "/timer-settings/migrate",
      payload,
    },
    execute: () => client.post("/timer-settings/migrate", payload),
  });

  return response.data;
}
