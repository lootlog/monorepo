import { Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DocsData } from "#src/http-api/handlers/docs/docs.handlers";
import { LootlogConfigData } from "#src/http-api/handlers/lootlog-config/lootlog-config.handlers";
import { MapTemplatesData } from "#src/http-api/handlers/map-templates/map-templates.handlers";
import { SettingsData } from "#src/http-api/handlers/settings/settings.operations";
import {
  BullWorkers,
  RabbitConsumers,
  ScheduledJobs,
} from "#src/http-api/runtime/background/background-layers";
import {
  chatData,
  guildConfigurationData,
  internalGuildsData,
  messagingData,
  publicSystemData,
  readyRoomData,
  reservationReadData,
  reservationSharingData,
  rolesData,
  userLootlogConfigData,
} from "#src/http-api/runtime/composition/core-data-layers";
import {
  eventsData,
  eventsServicesLive,
  recordsData,
  recordsServicesLive,
  notificationsData,
  notificationsServicesLive,
} from "#src/http-api/runtime/composition/domain-data-layers";
import {
  guildDiscordSyncLive,
  memberReadData,
  memberRefreshJobData,
  membersData,
  memberServicesLive,
  myReservationsData,
  organizationContextLookup,
  accountOrganizationData,
  accountOrganizationOperationsLive,
} from "#src/http-api/runtime/composition/member-data-layers";
import {
  eventTimersLive,
  reservationMutationsData,
  timersData,
} from "#src/http-api/runtime/composition/timer-data-layers";

const coreDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
  SettingsData.layerDatabase,
  DocsData.layerDatabase,
  publicSystemData,
  internalGuildsData,
  messagingData,
  readyRoomData,
  chatData,
  userLootlogConfigData,
  rolesData,
  guildConfigurationData,
  reservationSharingData,
  reservationReadData,
  memberReadData,
  memberRefreshJobData,
  membersData,
  organizationContextLookup,
  myReservationsData,
  reservationMutationsData,
  accountOrganizationData,
  timersData,
  recordsData,
  eventsData,
  notificationsData,
);

export const apiRequestDataLayers = coreDataLayers.pipe(
  Layer.provide(notificationsServicesLive),
  Layer.provide(eventsServicesLive),
  Layer.provide(accountOrganizationOperationsLive),
  Layer.provide(guildDiscordSyncLive),
  Layer.provide(recordsServicesLive),
  Layer.provide(eventTimersLive),
  Layer.provide(memberServicesLive),
  Layer.provide(ApiDatabaseLive),
);

export const apiDataLayers = Layer.mergeAll(
  coreDataLayers,
  BullWorkers,
  RabbitConsumers,
  ScheduledJobs,
).pipe(
  Layer.provide(notificationsServicesLive),
  Layer.provide(eventsServicesLive),
  Layer.provide(accountOrganizationOperationsLive),
  Layer.provide(guildDiscordSyncLive),
  Layer.provide(recordsServicesLive),
  Layer.provide(eventTimersLive),
  Layer.provide(memberServicesLive),
  Layer.provide(ApiDatabaseLive),
);
