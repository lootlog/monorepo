/** Authoritative composition root for the Lootlog HTTP contract. */
import { SchemaErrorResponse } from "./schema-error-response.js";
import { HttpApi, OpenApi } from "effect/http-api";
import { ApiKeyEndpointPolicy } from "@lootlog/schema/api-key-http";
import { UsersGroup } from "#src/contracts/users/api";
import { MembersGroup } from "#src/contracts/members/api";
import { GuildsGroup } from "#src/contracts/guilds/api";
import { InternalGroup } from "#src/contracts/internal/api";
import { RolesGroup } from "#src/contracts/roles/api";
import { TimersGroup } from "#src/contracts/timers/api";
import { HeroSightingsGroup } from "#src/contracts/hero-sightings/api";
import { UserLootlogConfigGroup } from "#src/contracts/user-lootlog-config/api";
import { PreferencesGroup } from "#src/contracts/preferences/api";
import { LootsGroup } from "#src/contracts/loots/api";
import { LootlogConfigGroup } from "#src/contracts/lootlog-config/api";
import { healthGroup } from "@lootlog/instrumentation/service";
import { ChatGroup } from "#src/contracts/chat/api";
import { GlobalChatGroup } from "#src/contracts/global-chat/api";
import { ReservationsGroup } from "#src/contracts/reservations/api";
import { ReservationSharingGroup } from "#src/contracts/reservation-sharing/api";
import { NotificationsGroup } from "#src/contracts/notifications/api";
import { MessagingGroup } from "#src/contracts/messaging/api";
import { PartyReadyRoomGroup } from "#src/contracts/party-ready-room/api";
import { EventsGroup } from "#src/contracts/events/api";
import { MapsGroup } from "#src/contracts/maps/api";
import { MapTemplatesGroup } from "#src/contracts/map-templates/api";
import { KillsGroup } from "#src/contracts/kills/api";
import { GuildStatsCardGroup } from "#src/contracts/guild-stats-card/api";
import { PublicGuildStatsCardGroup } from "#src/contracts/public-guild-stats-card/api";
import { DocsGroup } from "#src/contracts/docs/api";
import { UserThemesGroup } from "#src/contracts/user-themes/api";
import { CharacterAurasGroup } from "#src/contracts/character-auras/api";

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
    HeroSightingsGroup,
    UserLootlogConfigGroup,
    PreferencesGroup,
    LootsGroup,
    LootlogConfigGroup,
    healthGroup("Check the health status of the API"),
    ChatGroup,
    GlobalChatGroup,
    ReservationsGroup,
    ReservationSharingGroup,
    NotificationsGroup,
    MessagingGroup,
    PartyReadyRoomGroup,
    EventsGroup,
    MapsGroup,
    MapTemplatesGroup,
    KillsGroup,
    GuildStatsCardGroup,
    PublicGuildStatsCardGroup,
    DocsGroup,
    UserThemesGroup,
    CharacterAurasGroup,
  )
  .middleware(ApiKeyEndpointPolicy)
  .middleware(SchemaErrorResponse) {}
