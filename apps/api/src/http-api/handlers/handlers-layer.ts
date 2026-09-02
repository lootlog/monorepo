import { Layer } from "effect";
import { ChatHandlers } from "./chat/chat.handlers.js";
import { DocsHandlers } from "./docs/docs.handlers.js";
import { EventsHandlers } from "./events/events.handlers.js";
import { InternalGuildsHandlers } from "./internal/internal.handlers.js";
import {
  KillsHandlers,
  LootsHandlers,
} from "./kills-loots/kills-loots.handlers.js";
import { LootlogConfigHandlers } from "./lootlog-config/lootlog-config.handlers.js";
import { MapTemplatesHandlers } from "./map-templates/map-templates.handlers.js";
import { MembersHandlers } from "./members/members.handlers.js";
import { MessagingHandlers } from "./messaging/messaging.handlers.js";
import { NotificationsHandlers } from "./notifications/notifications.handlers.js";
import { PartyReadyRoomHandlers } from "./party-ready-room/party-ready-room.handlers.js";
import {
  GuildStatsCardHandlers,
  HealthHandlers,
  MapsHandlers,
  PublicGuildStatsCardHandlers,
} from "./public-system/public-system.handlers.js";
import {
  ReservationSharingHandlers,
  ReservationsHandlers,
  RolesHandlers,
} from "./reservations-roles/reservations-roles.handlers.js";
import {
  PreferencesHandlers,
  SoundSettingsHandlers,
  TimerSettingsHandlers,
} from "./settings/settings.handlers.js";
import { TimersHandlers } from "./timers/timers.handlers.js";
import { UserLootlogConfigHandlers } from "./user-lootlog-config/user-lootlog-config.handlers.js";
import {
  GuildsHandlers,
  UsersHandlers,
} from "./users-guilds/users-guilds.handlers.js";

export const LootlogApiHandlers = Layer.mergeAll(
  UsersHandlers,
  MembersHandlers,
  GuildsHandlers,
  InternalGuildsHandlers,
  RolesHandlers,
  TimersHandlers,
  UserLootlogConfigHandlers,
  TimerSettingsHandlers,
  PreferencesHandlers,
  LootsHandlers,
  LootlogConfigHandlers,
  HealthHandlers,
  ChatHandlers,
  ReservationsHandlers,
  ReservationSharingHandlers,
  NotificationsHandlers,
  MessagingHandlers,
  PartyReadyRoomHandlers,
  SoundSettingsHandlers,
  EventsHandlers,
  MapsHandlers,
  MapTemplatesHandlers,
  KillsHandlers,
  GuildStatsCardHandlers,
  PublicGuildStatsCardHandlers,
  DocsHandlers,
);
