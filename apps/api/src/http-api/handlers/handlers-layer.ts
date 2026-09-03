import { Layer } from "effect";
import { ChatHandlers } from "./chat/chat.handlers.js";
import { DocsHandlers } from "./docs/docs.handlers.js";
import { EventsHandlers } from "./events/events.handlers.js";
import { GuildStatsCardHandlers } from "./guild-stats-card/guild-stats-card.handlers.js";
import { GuildsHandlers } from "./guilds/guilds.handlers.js";
import { HealthHandlers } from "./health/health.handlers.js";
import { InternalGuildsHandlers } from "./internal/internal.handlers.js";
import { KillsHandlers } from "./kills/kills.handlers.js";
import { LootsHandlers } from "./loots/loots.handlers.js";
import { LootlogConfigHandlers } from "./lootlog-config/lootlog-config.handlers.js";
import { MapsHandlers } from "./maps/maps.handlers.js";
import { MapTemplatesHandlers } from "./map-templates/map-templates.handlers.js";
import { MembersHandlers } from "./members/members.handlers.js";
import { MessagingHandlers } from "./messaging/messaging.handlers.js";
import { NotificationsHandlers } from "./notifications/notifications.handlers.js";
import { PartyReadyRoomHandlers } from "./party-ready-room/party-ready-room.handlers.js";
import { PreferencesHandlers } from "./preferences/preferences.handlers.js";
import { PublicGuildStatsCardHandlers } from "./public-guild-stats-card/public-guild-stats-card.handlers.js";
import { ReservationSharingHandlers } from "./reservation-sharing/reservation-sharing.handlers.js";
import { ReservationsHandlers } from "./reservations/reservations.handlers.js";
import { RolesHandlers } from "./roles/roles.handlers.js";
import { SoundSettingsHandlers } from "./sound-settings/sound-settings.handlers.js";
import { TimerSettingsHandlers } from "./timer-settings/timer-settings.handlers.js";
import { TimersHandlers } from "./timers/timers.handlers.js";
import { UserLootlogConfigHandlers } from "./user-lootlog-config/user-lootlog-config.handlers.js";
import { UsersHandlers } from "./users/users.handlers.js";

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
