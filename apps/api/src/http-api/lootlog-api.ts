/** Authoritative composition root for the Lootlog HTTP contract. */
import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { UsersGroup } from "./contracts/users/api.js";
import { MembersGroup } from "./contracts/members/api.js";
import { GuildsGroup } from "./contracts/guilds/api.js";
import { InternalGroup } from "./contracts/internal/api.js";
import { RolesGroup } from "./contracts/roles/api.js";
import { TimersGroup } from "./contracts/timers/api.js";
import { UserLootlogConfigGroup } from "./contracts/user-lootlog-config/api.js";
import { TimerSettingsGroup } from "./contracts/timer-settings/api.js";
import { PreferencesGroup } from "./contracts/preferences/api.js";
import { LootsGroup } from "./contracts/loots/api.js";
import { LootlogConfigGroup } from "./contracts/lootlog-config/api.js";
import { HealthGroup } from "./contracts/health/api.js";
import { ChatGroup } from "./contracts/chat/api.js";
import { ReservationsGroup } from "./contracts/reservations/api.js";
import { ReservationSharingGroup } from "./contracts/reservation-sharing/api.js";
import { NotificationsGroup } from "./contracts/notifications/api.js";
import { MessagingGroup } from "./contracts/messaging/api.js";
import { PartyReadyRoomGroup } from "./contracts/party-ready-room/api.js";
import { SoundSettingsGroup } from "./contracts/sound-settings/api.js";
import { EventsGroup } from "./contracts/events/api.js";
import { MapsGroup } from "./contracts/maps/api.js";
import { MapTemplatesGroup } from "./contracts/map-templates/api.js";
import { KillsGroup } from "./contracts/kills/api.js";
import { GuildStatsCardGroup } from "./contracts/guild-stats-card/api.js";
import { PublicGuildStatsCardGroup } from "./contracts/public-guild-stats-card/api.js";
import { DocsGroup } from "./contracts/docs/api.js";

export class LootlogApi extends HttpApi.make("LootlogApi")
  .annotate(OpenApi.Title, "Lootlog API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "The Lootlog API documentation")
  .annotate(OpenApi.Servers, [])
  .add(
    UsersGroup,
    MembersGroup,
    GuildsGroup,
    InternalGroup,
    RolesGroup,
    TimersGroup,
    UserLootlogConfigGroup,
    TimerSettingsGroup,
    PreferencesGroup,
    LootsGroup,
    LootlogConfigGroup,
    HealthGroup,
    ChatGroup,
    ReservationsGroup,
    ReservationSharingGroup,
    NotificationsGroup,
    MessagingGroup,
    PartyReadyRoomGroup,
    SoundSettingsGroup,
    EventsGroup,
    MapsGroup,
    MapTemplatesGroup,
    KillsGroup,
    GuildStatsCardGroup,
    PublicGuildStatsCardGroup,
    DocsGroup,
  ) {}
