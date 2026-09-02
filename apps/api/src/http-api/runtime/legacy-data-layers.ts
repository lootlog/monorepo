import type { Type } from "@nestjs/common";
import { Effect, Layer } from "effect";
import { ChatService } from "#src/chat/chat.service";
import { GuildsService } from "#src/guilds/guilds.service";
import { KillsService } from "#src/kills/kills.service";
import { LootAllocationService } from "#src/loots/loot-allocation.service";
import { LootSubmissionAcceptanceService } from "#src/loots/loot-submission-acceptance.service";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import { LootsService } from "#src/loots/loots.service";
import { MembersService } from "#src/members/members.service";
import { MessagingService } from "#src/messaging/messaging.service";
import { ReadyRoomService } from "#src/messaging/ready-room/ready-room.service";
import { ReservationMutationsService } from "#src/reservations/reservation-mutations.service";
import { ReservationSharingService } from "#src/reservations/reservation-sharing.service";
import { ReservationsService } from "#src/reservations/reservations.service";
import { RolesService } from "#src/roles/roles.service";
import { MemberContextService } from "#src/shared/permissions/member-context.service";
import { TimersService } from "#src/timers/timers.service";
import { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import { UsersService } from "#src/users/users.service";
import { ChatData } from "../handlers/chat/chat.handlers.js";
import { EventsData } from "../handlers/events/events.handlers.js";
import { InternalGuildsData } from "../handlers/internal/internal.handlers.js";
import { legacyKillsLootsDataLayer } from "../handlers/kills-loots/kills-loots.legacy-layer.js";
import { MembersData } from "../handlers/members/members.handlers.js";
import { MessagingData } from "../handlers/messaging/messaging.handlers.js";
import { NotificationsData } from "../handlers/notifications/notifications.handlers.js";
import { ReadyRoomData } from "../handlers/party-ready-room/party-ready-room.handlers.js";
import { ReservationsRolesData } from "../handlers/reservations-roles/reservations-roles.handlers.js";
import { TimersData } from "../handlers/timers/timers.handlers.js";
import { UserLootlogConfigData } from "../handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import { UsersGuildsData } from "../handlers/users-guilds/users-guilds.handlers.js";
import { LegacyNestApplication } from "./legacy-nest-application.js";
import { createControllerDispatcher } from "./legacy-controller-dispatcher.js";
import { OrganizationContextLookup } from "./organization-context.js";

/**
 * Resolves established application services from the non-listening Nest
 * container and adapts them to every Effect HTTP port. This is the single
 * compatibility seam to delete as the remaining service implementations move
 * to native Effect Layers.
 */
export const LegacyApiDataLayers = Layer.unwrap(
  Effect.gen(function* () {
    const { app } = yield* LegacyNestApplication;
    const service = <A>(token: Type<A>): A => app.get(token, { strict: false });

    const guilds = service(GuildsService);
    const loots = service(LootsService);
    const dispatch = createControllerDispatcher(app);

    return Layer.mergeAll(
      InternalGuildsData.layerService(guilds),
      UserLootlogConfigData.layerService(service(UserLootlogConfigService)),
      MessagingData.layerService(service(MessagingService)),
      EventsData.layerLegacy(dispatch),
      ReadyRoomData.layerServices(service(ReadyRoomService), guilds),
      MembersData.layerService(service(MembersService)),
      UsersGuildsData.layerServices(service(UsersService), guilds),
      ReservationsRolesData.layerServices({
        reservations: service(ReservationsService),
        mutations: service(ReservationMutationsService),
        roles: service(RolesService),
        sharing: service(ReservationSharingService),
      }),
      TimersData.layerService(service(TimersService)),
      ChatData.layerService(service(ChatService)),
      legacyKillsLootsDataLayer({
        kills: service(KillsService),
        loots,
        lootStats: service(LootStatsService),
        lootSubmissionAcceptance: service(LootSubmissionAcceptanceService),
        lootAllocation: service(LootAllocationService),
      }),
      NotificationsData.layerLegacy(dispatch),
      OrganizationContextLookup.layerLegacy(service(MemberContextService)),
    );
  }),
);
