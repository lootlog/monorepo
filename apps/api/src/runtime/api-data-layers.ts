import { UserThemesData } from "#src/users/user-themes-data";
import { UserEquipmentSetsData } from "#src/users/user-equipment-sets-data";
import {
  eventsData,
  eventsServicesLive,
  eventTimersLive,
} from "#src/runtime/features/events";
import {
  reservationData,
  reservationSharingData,
} from "#src/runtime/features/reservations";
import { EventHeroKillQueue } from "#src/runtime/queues/event-hero-kill";
import { MemberBulkRefreshQueue } from "#src/runtime/queues/member-bulk-refresh";
import { MemberRefreshQueue } from "#src/runtime/queues/member-refresh";
import { NotificationDispatchQueue } from "#src/runtime/queues/notification-dispatch";
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
import { DocsData } from "#src/docs/docs-data";
import { LootlogConfigData } from "#src/lootlog-config/lootlog-config-data";
import { MapTemplatesData } from "#src/map-templates/map-templates-data";
import { SettingsData } from "#src/settings-documents/settings-data";
import {
  BullWorkers,
  RabbitConsumers,
  ScheduledJobs,
} from "#src/runtime/background/background-layers";
import { chatData } from "#src/runtime/features/chat";
import { globalChatData } from "#src/runtime/features/global-chat";
import { characterAurasData } from "#src/runtime/features/character-auras";
import { userPlansDataLayer } from "#src/plans/user-plans";

const userPlansData = userPlansDataLayer.pipe(
  Layer.provide(characterAurasData),
);

import { organizationOperatorData } from "#src/runtime/features/organization-operator";
import { messagingData } from "#src/runtime/features/messaging";
import { publicSystemData } from "#src/runtime/features/public-system";
import {
  readyRoomData,
  readyRoomPublications,
} from "#src/runtime/features/ready-room";
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
import { MemberRefreshJobDataLive } from "#src/members/member-read.data-layer";
import { MyReservationsData } from "#src/reservations/reservations-data";
import { timersData } from "#src/runtime/features/timers";
import { heroSightingsData } from "#src/runtime/features/hero-sightings";
import { bingoServicesLive } from "#src/runtime/features/bingo";

const coreDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  UserThemesData.layerDatabase,
  UserEquipmentSetsData.layerDatabase,
  LootlogConfigData.layerDatabase,
  SettingsData.layerDatabase,
  DocsData.layerDatabase,
  publicSystemData,
  internalGuildsData,
  messagingData,
  readyRoomData,
  chatData,
  globalChatData,
  characterAurasData,
  userPlansData,
  organizationOperatorData,
  userLootlogConfigData,
  rolesData,
  guildConfigurationData,
  reservationSharingData,
  reservationData,
  memberReadData,
  MemberRefreshJobDataLive,
  membersData,
  organizationContextLookup,
  MyReservationsData.layerDatabase,
  accountOrganizationData,
  timersData.pipe(Layer.provide(readyRoomData)),
  heroSightingsData,
  recordsData,
  eventsData,
  notificationsData,
);

const apiQueues = Layer.mergeAll(
  EventHeroKillQueue.layer,
  MemberBulkRefreshQueue.layer,
  MemberRefreshQueue.layer,
  NotificationDispatchQueue.layer,
);

export const apiRequestDataLayers = coreDataLayers.pipe(
  Layer.provide(notificationsServicesLive),
  Layer.provide(eventsServicesLive),
  Layer.provide(accountOrganizationOperationsLive),
  Layer.provide(guildDiscordSyncLive),
  Layer.provide(recordsServicesLive),
  Layer.provide(eventTimersLive),
  Layer.provide(memberServicesLive),
  Layer.provideMerge(bingoServicesLive),
  Layer.provide(Layer.merge(ApiDatabaseLive, apiQueues)),
);

export const apiDataLayers = Layer.mergeAll(
  coreDataLayers,
  readyRoomPublications,
  BullWorkers,
  RabbitConsumers.pipe(Layer.provide(readyRoomData)),
  ScheduledJobs.pipe(Layer.provide(userPlansData)),
).pipe(
  Layer.provide(notificationsServicesLive),
  Layer.provide(eventsServicesLive),
  Layer.provide(accountOrganizationOperationsLive),
  Layer.provide(guildDiscordSyncLive),
  Layer.provide(recordsServicesLive),
  Layer.provide(eventTimersLive),
  Layer.provide(memberServicesLive),
  Layer.provideMerge(bingoServicesLive),
  Layer.provide(Layer.merge(ApiDatabaseLive, apiQueues)),
);
