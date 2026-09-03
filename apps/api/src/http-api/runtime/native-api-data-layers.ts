import { Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DocsData } from "../handlers/docs/docs.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { SettingsData } from "../handlers/settings/settings.handlers.js";
import {
  NativeBullWorkers,
  NativeRabbitConsumers,
  NativeScheduledJobs,
} from "./native-background-layers.js";
import {
  NativeChatData,
  NativeGuildConfigurationData,
  NativeInternalGuildsData,
  NativeMessagingData,
  NativePublicSystemData,
  NativeReadyRoomData,
  NativeReservationReadData,
  NativeReservationSharingData,
  NativeRolesData,
  NativeUserLootlogConfigData,
} from "./native-core-data-layers.js";
import {
  NativeEventsData,
  NativeEventsServicesLive,
  NativeKillsLootsData,
  NativeKillsLootsServicesLive,
  NativeNotificationsData,
  NativeNotificationsServicesLive,
} from "./native-domain-data-layers.js";
import {
  NativeGuildDiscordSyncLive,
  NativeMemberReadData,
  NativeMemberRefreshJobData,
  NativeMembersData,
  NativeMemberServicesLive,
  NativeMyReservationsData,
  NativeOrganizationContextLookup,
  NativeUsersGuildsData,
  NativeUsersGuildsOperationsLive,
} from "./native-member-data-layers.js";
import {
  NativeEventTimersLive,
  NativeReservationMutationsData,
  NativeTimersData,
} from "./native-timer-data-layers.js";

export const NativeApiRequestDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
  SettingsData.layerDatabase,
  DocsData.layerDatabase,
  NativePublicSystemData,
  NativeInternalGuildsData,
  NativeMessagingData,
  NativeReadyRoomData,
  NativeChatData,
  NativeUserLootlogConfigData,
  NativeRolesData,
  NativeGuildConfigurationData,
  NativeReservationSharingData,
  NativeReservationReadData,
  NativeMemberReadData,
  NativeMemberRefreshJobData,
  NativeMembersData,
  NativeOrganizationContextLookup,
  NativeMyReservationsData,
  NativeReservationMutationsData,
  NativeUsersGuildsData,
  NativeTimersData,
  NativeKillsLootsData,
  NativeEventsData,
  NativeNotificationsData,
).pipe(
  Layer.provide(NativeNotificationsServicesLive),
  Layer.provide(NativeEventsServicesLive),
  Layer.provide(NativeUsersGuildsOperationsLive),
  Layer.provide(NativeGuildDiscordSyncLive),
  Layer.provide(NativeKillsLootsServicesLive),
  Layer.provide(NativeEventTimersLive),
  Layer.provide(NativeMemberServicesLive),
  Layer.provide(ApiDatabaseLive),
);

export const NativeApiDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
  SettingsData.layerDatabase,
  DocsData.layerDatabase,
  NativePublicSystemData,
  NativeInternalGuildsData,
  NativeMessagingData,
  NativeReadyRoomData,
  NativeChatData,
  NativeUserLootlogConfigData,
  NativeRolesData,
  NativeGuildConfigurationData,
  NativeReservationSharingData,
  NativeReservationReadData,
  NativeMemberReadData,
  NativeMemberRefreshJobData,
  NativeMembersData,
  NativeOrganizationContextLookup,
  NativeMyReservationsData,
  NativeReservationMutationsData,
  NativeUsersGuildsData,
  NativeTimersData,
  NativeKillsLootsData,
  NativeEventsData,
  NativeNotificationsData,
  NativeBullWorkers,
  NativeRabbitConsumers,
  NativeScheduledJobs,
).pipe(
  Layer.provide(NativeNotificationsServicesLive),
  Layer.provide(NativeEventsServicesLive),
  Layer.provide(NativeUsersGuildsOperationsLive),
  Layer.provide(NativeGuildDiscordSyncLive),
  Layer.provide(NativeKillsLootsServicesLive),
  Layer.provide(NativeEventTimersLive),
  Layer.provide(NativeMemberServicesLive),
  Layer.provide(ApiDatabaseLive),
);
