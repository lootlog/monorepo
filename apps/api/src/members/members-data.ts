import type { ApiKeyAccess } from "@lootlog/schema/api-key-access";
import type { MemberWithRoles, StoredMemberWithRoles } from "./member.types.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Schema } from "effect";
import type { ReauthenticationRequired } from "#src/contracts/api-shared";

export type MembersIdentity = {
  readonly userId: string;
  readonly discordId: string;
  readonly apiKey?: ApiKeyAccess;
};

export class MembersOperationError extends TaggedErrorClass<MembersOperationError>()(
  "MembersOperationError",
  { cause: Schema.Defect() },
) {}

type DataEffect = Effect.Effect<unknown, MembersOperationError>;

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
    readonly refreshMember: (guildId: string, discordId: string) => DataEffect;
    readonly deactivateMember: (
      guildId: string,
      discordId: string,
    ) => DataEffect;
    readonly refreshAllMembers: (
      guildId: string,
      discordId: string,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/members/data") {}

export class MemberRefreshJobData extends Context.Service<
  MemberRefreshJobData,
  {
    readonly getLatestRefreshJob: (guildId: string) => DataEffect;
    readonly getRefreshJobStatus: (
      guildId: string,
      jobId: number,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/member-refresh-job/data") {}

export class MemberReadData extends Context.Service<
  MemberReadData,
  {
    readonly getLootlogConfigSummary: (
      guildId: string,
      discordId: string,
    ) => DataEffect;
    readonly getGuildMembers: (
      guildId: string,
      includeInactive: boolean,
    ) => DataEffect;
    readonly getGuildMemberReferences: (
      guildId: string,
      includeInactive: boolean,
    ) => DataEffect;
    readonly getGuildMembersSummary: (guildId: string) => DataEffect;
  }
>()("@lootlog/api/http-api/member-read/data") {}
