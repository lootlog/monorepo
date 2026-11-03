import {
  reauthenticationRequiredResponse,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  HERO_SIGHTING_WRITE_PERMISSION,
  NPC_FEATURE_PERMISSIONS,
  HERO_SIGHTING_READ_FEATURE,
} from "@lootlog/domain/npc-permissions";
import type { Permission as PermissionValue } from "@lootlog/schema/permissions";
import { applicationErrorResponse } from "../../application-error-response.js";
import { LootlogApi } from "../../lootlog-api.js";
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";
import type {
  ClaimHeroSightingRequest,
  CreateHeroSightingRequest,
  CreateHeroSightingResponse,
  HeroSightingResponse,
  HeroSightingsResponse,
} from "#src/contracts/hero-sightings/schemas";
import type { Guild, Role } from "#src/timers/timers.types";
import type { MemberWithRoles } from "#src/members/member.types";
import type {
  HeroSightingsDataFailure,
  HeroSightingsNotFound,
} from "./hero-sighting-errors.js";

export type HeroSightingsIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type HeroSightingsGuildAccess = HeroSightingsIdentity & {
  readonly guild: Guild;
  readonly member: MemberWithRoles;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
};

export class HeroSightingsAccessDenied extends TaggedErrorClass<HeroSightingsAccessDenied>()(
  "HeroSightingsAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class HeroSightingsAuthorization extends Context.Service<
  HeroSightingsAuthorization,
  {
    readonly identity: Effect.Effect<
      HeroSightingsIdentity,
      HeroSightingsAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly capability: PermissionValue;
    }) => Effect.Effect<
      HeroSightingsGuildAccess,
      | HeroSightingsAccessDenied
      | HeroSightingsNotFound
      | ReauthenticationRequired
    >;
  }
>()("@lootlog/api/http-api/hero-sightings/authorization") {}

type DataEffect<A> = Effect.Effect<A, HeroSightingsDataFailure>;

export class HeroSightingsData extends Context.Service<
  HeroSightingsData,
  {
    readonly create: (
      identity: HeroSightingsIdentity,
      payload: CreateHeroSightingRequest,
    ) => DataEffect<CreateHeroSightingResponse>;
    readonly getAll: (
      identity: HeroSightingsIdentity,
      world: string,
    ) => DataEffect<HeroSightingsResponse>;
    readonly getGuildSightings: (
      access: HeroSightingsGuildAccess,
      world: string,
    ) => DataEffect<HeroSightingsResponse>;
    readonly getHistory: (
      access: HeroSightingsGuildAccess,
      world: string,
      hero: string,
    ) => DataEffect<HeroSightingsResponse>;
    readonly claim: (
      access: HeroSightingsGuildAccess,
      sightingId: number,
      payload: ClaimHeroSightingRequest,
    ) => DataEffect<HeroSightingResponse>;
    readonly unclaim: (
      access: HeroSightingsGuildAccess,
      sightingId: number,
    ) => DataEffect<HeroSightingResponse>;
  }
>()("@lootlog/api/http-api/hero-sightings/data") {}

/** Reads need the hero tier as well, which each sighting checks by its level. */
const READ_PERMISSION =
  NPC_FEATURE_PERMISSIONS[HERO_SIGHTING_READ_FEATURE].base;

const identity = Effect.flatMap(
  HeroSightingsAuthorization,
  (service) => service.identity,
);

const requireGuild = (guildId: string, capability: PermissionValue) =>
  Effect.flatMap(HeroSightingsAuthorization, (service) =>
    service.requireGuild({ guildId, capability }),
  );

const data = <A>(
  operation: (service: HeroSightingsData["Service"]) => DataEffect<A>,
) => Effect.flatMap(HeroSightingsData, operation);

type HeroSightingsHttpFailure =
  | HeroSightingsAccessDenied
  | HeroSightingsDataFailure
  | ReauthenticationRequired;

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, HeroSightingsHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    ApplicationError: applicationErrorResponse,
    HeroSightingsAccessDenied: statusCodeResponse,
    HeroSightingsNotFound: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    HeroSightingsInfrastructureError: (error) => Effect.die(error.cause),
  });

const sightingId = (value: string) => Number.parseInt(value, 10);

export const HeroSightingsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "hero-sightings",
  (handlers) =>
    handlers
      .handle("HeroSightingsControllerCreateHeroSighting", ({ payload }) =>
        toHttpResponse(
          Effect.flatMap(identity, (current) =>
            data((service) => service.create(current, payload)),
          ),
        ),
      )
      .handle("HeroSightingsControllerGetAllHeroSightings", ({ query }) =>
        toHttpResponse(
          Effect.flatMap(identity, (current) =>
            data((service) => service.getAll(current, query.world)),
          ),
        ),
      )
      .handle("HeroSightingsControllerGetHeroSightings", ({ params, query }) =>
        toHttpResponse(
          Effect.flatMap(
            requireGuild(params.guildId, READ_PERMISSION),
            (access) =>
              data((service) => service.getGuildSightings(access, query.world)),
          ),
        ),
      )
      .handle(
        "HeroSightingsControllerGetHeroSightingHistory",
        ({ params, query }) =>
          toHttpResponse(
            Effect.flatMap(
              requireGuild(params.guildId, READ_PERMISSION),
              (access) =>
                data((service) =>
                  service.getHistory(access, query.world, query.hero),
                ),
            ),
          ),
      )
      .handle(
        "HeroSightingsControllerClaimHeroSighting",
        ({ params, payload }) =>
          toHttpResponse(
            Effect.flatMap(
              requireGuild(params.guildId, HERO_SIGHTING_WRITE_PERMISSION),
              (access) =>
                data((service) =>
                  service.claim(access, sightingId(params.sightingId), payload),
                ),
            ),
          ),
      )
      .handle("HeroSightingsControllerUnclaimHeroSighting", ({ params }) =>
        toHttpResponse(
          Effect.flatMap(
            requireGuild(params.guildId, HERO_SIGHTING_WRITE_PERMISSION),
            (access) =>
              data((service) =>
                service.unclaim(access, sightingId(params.sightingId)),
              ),
          ),
        ),
      ),
);
