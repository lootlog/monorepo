import { Context, Effect } from "effect";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import type {
  ClaimHeroSightingRequest,
  CreateHeroSightingRequest,
  CreateHeroSightingResponse,
  HeroSightingResponse,
  HeroSightingsResponse,
} from "#src/contracts/hero-sightings/schemas";
import type { Guild, Role } from "#src/timers/timers.types";
import type { MemberWithRoles } from "#src/members/member.types";
import type { HeroSightingsDataFailure } from "./hero-sighting-errors.js";

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

export type DataEffect<A> = Effect.Effect<A, HeroSightingsDataFailure>;

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
