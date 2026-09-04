import {
  eventsData,
  eventsServicesLive,
  eventTimersLive,
} from "#src/runtime/features/events";
import {
  reservationReadData,
  reservationSharingData,
  reservationMutationsData,
} from "#src/runtime/features/reservations";
import {
  guildConfigurationData,
  internalGuildsData,
  rolesData,
  guildDiscordSyncLive,
  organizationContextLookup,
  accountOrganizationData,
  accountOrganizationOperationsLive,
} from "#src/runtime/features/organizations";
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
} from "#src/runtime/background/background-layers";
import { chatData } from "#src/runtime/features/chat";
import { messagingData } from "#src/runtime/features/messaging";
import { publicSystemData } from "#src/runtime/features/public-system";
import { readyRoomData } from "#src/runtime/features/ready-room";
import { userLootlogConfigData } from "#src/runtime/features/user-settings";
import {
  recordsData,
  recordsServicesLive,
} from "#src/runtime/features/records";
import {
  notificationsData,
  notificationsServicesLive,
} from "#src/runtime/features/notifications";
import {
  memberReadData,
  membersData,
  memberServicesLive,
} from "#src/runtime/features/members";
import { MemberRefreshJobDataLive } from "#src/http-api/handlers/members/member-read.data-layer";
import { MyReservationsData } from "#src/http-api/handlers/organization-workspace/organization-workspace.operations";
import { timersData } from "#src/runtime/features/timers";

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
  MemberRefreshJobDataLive,
  membersData,
  organizationContextLookup,
  MyReservationsData.layerDatabase,
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
