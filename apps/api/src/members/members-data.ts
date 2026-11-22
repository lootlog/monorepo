import type { ReauthenticationRequired } from "@lootlog/protocol/http/errors";
import type { ApiKeyAccess } from "@lootlog/schema/api-key-access";
import type { MemberWithRoles, StoredMemberWithRoles } from "./member.types.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type {
  MemberLootlogConfigSummaryResponse,
  MemberReferencesResponse,
  MemberSummariesResponse,
} from "#src/contracts/members/schemas";
import type { memberRefreshJobTable } from "#src/database/drizzle/organization.schema";

export type MembersIdentity = {
  readonly userId: string;
  readonly discordId: string;
  readonly apiKey?: ApiKeyAccess;
};

export class MembersOperationError extends TaggedErrorClass<
  MembersOperationError,
  { readonly brand: unique symbol }
>()("MembersOperationError", { cause: Schema.Defect() }) {}

type DataEffect<A> = Effect.Effect<A, MembersOperationError>;

type MemberRefreshJob = typeof memberRefreshJobTable.$inferSelect & {
  readonly nextAvailableAt: Date;
};

export class MembersData extends Context.Service<
  MembersData,
  {
    readonly getMe: (
      identity: MembersIdentity,
      guildId: string,
      refresh: boolean,
    ) => Effect.Effect<
      MemberWithRoles | null,
      MembersOperationError | ReauthenticationRequired
    >;
    /** The stored member and its roles, without contacting Discord. */
    readonly findStoredMember: (
      discordId: string,
      guildId: string,
    ) => Effect.Effect<StoredMemberWithRoles | null, MembersOperationError>;
    readonly refreshMember: (
      guildId: string,
      discordId: string,
    ) => DataEffect<MemberWithRoles | null>;
    readonly deactivateMember: (
      guildId: string,
      discordId: string,
    ) => DataEffect<StoredMemberWithRoles>;
    readonly refreshAllMembers: (
      guildId: string,
      discordId: string,
    ) => DataEffect<MemberRefreshJob>;
  }
>()("@lootlog/api/http-api/members/data") {}

export class MemberRefreshJobData extends Context.Service<
  MemberRefreshJobData,
  {
    readonly getLatestRefreshJob: (
      guildId: string,
    ) => DataEffect<MemberRefreshJob | null>;
    readonly getRefreshJobStatus: (
      guildId: string,
      jobId: number,
    ) => DataEffect<MemberRefreshJob>;
  }
>()("@lootlog/api/http-api/member-refresh-job/data") {}

export class MemberReadData extends Context.Service<
  MemberReadData,
  {
    readonly getLootlogConfigSummary: (
      guildId: string,
      discordId: string,
    ) => DataEffect<MemberLootlogConfigSummaryResponse>;
    readonly getGuildMembers: (
      guildId: string,
      includeInactive: boolean,
    ) => DataEffect<ReadonlyArray<StoredMemberWithRoles>>;
    readonly getGuildMemberReferences: (
      guildId: string,
      includeInactive: boolean,
    ) => DataEffect<MemberReferencesResponse>;
    readonly getGuildMembersSummary: (
      guildId: string,
    ) => DataEffect<MemberSummariesResponse>;
  }
>()("@lootlog/api/http-api/member-read/data") {}
