import type { ReauthenticationRequired } from "@lootlog/protocol/http/errors";
import type {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import {
  AccessRequirement,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Schema, type Effect } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

type Guild = typeof guildTable.$inferSelect;

type Member = typeof memberTable.$inferSelect;

type Role = typeof roleTable.$inferSelect;

export interface AuthorizedEventCaller {
  readonly discordId: string;
  readonly userId: string;
  readonly guild: Guild;
  readonly member: Member;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

export class EventsAccessDenied extends TaggedErrorClass<EventsAccessDenied>()(
  "EventsAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

export class EventsNotFound extends TaggedErrorClass<EventsNotFound>()(
  "EventsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

export interface EventAuthorizationRequirement {
  readonly guildId: string;
  readonly capabilities: ReadonlyArray<PermissionValue>;
  readonly mode: "all" | "any";
}

export class EventsAuthorization extends Context.Service<
  EventsAuthorization,
  {
    readonly requireGuild: (
      requirement: EventAuthorizationRequirement,
    ) => Effect.Effect<
      AuthorizedEventCaller,
      EventsAccessDenied | EventsNotFound | ReauthenticationRequired
    >;
  }
>()("@lootlog/api/http-api/events/authorization") {}

const read = {
  capabilities: [Permission.LOOTLOG_EVENTS_READ],
  mode: "all",
} as const;

const write = {
  capabilities: [Permission.LOOTLOG_EVENTS_WRITE],
  mode: "all",
} as const;

const manage = {
  capabilities: [Permission.LOOTLOG_EVENTS_MANAGE],
  mode: "all",
} as const;

const administer = {
  capabilities: AccessRequirement.ADMINISTER,
  mode: "any",
} as const;

const timers = {
  capabilities: [Permission.LOOTLOG_TIMERS_READ],
  mode: "all",
} as const;

export const eventRequirements = { read, write, manage, administer, timers };
