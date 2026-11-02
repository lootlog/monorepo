import { Option, Schema } from "effect";
import {
  ApplicationError,
  applicationErrorStatus,
  DependencyUnavailableError,
} from "#src/shared/http/http-errors";

export const MEMBER_DISCORD_SYNC_STATUS = {
  SUCCESS: "SUCCESS",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  QUEUED: "QUEUED",
  RATE_LIMITED: "RATE_LIMITED",
  AUTH_SERVICE_UNAVAILABLE: "AUTH_SERVICE_UNAVAILABLE",
  DISCORD_SERVICE_UNAVAILABLE: "DISCORD_SERVICE_UNAVAILABLE",
  ERROR: "ERROR",
} as const;

const DISCORD_HTTP_SYNC_STATUS_PREFIX = "DISCORD_HTTP_";

type MemberDiscordSyncStatusValue =
  (typeof MEMBER_DISCORD_SYNC_STATUS)[keyof typeof MEMBER_DISCORD_SYNC_STATUS];

export type DiscordHttpSyncStatus =
  `${typeof DISCORD_HTTP_SYNC_STATUS_PREFIX}${number}`;

export type MemberSyncStatus =
  | Exclude<MemberDiscordSyncStatusValue, "QUEUED">
  | DiscordHttpSyncStatus;

export type MemberRefreshStatus =
  | MemberSyncStatus
  | typeof MEMBER_DISCORD_SYNC_STATUS.QUEUED;

function toDiscordHttpSyncStatus(statusCode: number): DiscordHttpSyncStatus {
  return `${DISCORD_HTTP_SYNC_STATUS_PREFIX}${statusCode}`;
}

export function isTransientMemberSyncStatus(
  status: MemberRefreshStatus,
): boolean {
  return (
    status === MEMBER_DISCORD_SYNC_STATUS.QUEUED ||
    isRetryableMemberRefreshStatus(status)
  );
}

export function isRetryableMemberRefreshStatus(
  status: MemberRefreshStatus,
): boolean {
  return (
    status === MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED ||
    status === MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE ||
    status === MEMBER_DISCORD_SYNC_STATUS.DISCORD_SERVICE_UNAVAILABLE ||
    status === MEMBER_DISCORD_SYNC_STATUS.ERROR ||
    status.startsWith(DISCORD_HTTP_SYNC_STATUS_PREFIX)
  );
}

export function getTransientMemberSyncStatus(error: unknown): MemberSyncStatus {
  if (error instanceof DependencyUnavailableError) {
    if (
      error.body.code === MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE
    ) {
      return MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE;
    }

    const discordStatus = getDiscordHttpErrorStatus(error);

    if (discordStatus !== null) {
      return toDiscordHttpSyncStatus(discordStatus);
    }

    return MEMBER_DISCORD_SYNC_STATUS.DISCORD_SERVICE_UNAVAILABLE;
  }

  if (error instanceof ApplicationError) {
    return toDiscordHttpSyncStatus(applicationErrorStatus(error));
  }

  return MEMBER_DISCORD_SYNC_STATUS.ERROR;
}

/**
 * Discord is reachable and refused this member's request (for example 403),
 * so the failure belongs to the member, not to Discord or Lootlog.
 */
export function isDiscordRefusalSyncStatus(status: MemberSyncStatus): boolean {
  return /^DISCORD_HTTP_4\d\d$/.test(status);
}

// toDiscordRequestError keeps a Discord status it has no dedicated error for
// as DISCORD_HTTP_ERROR with Discord's status in `details`.
const decodeDiscordHttpError = Schema.decodeUnknownOption(
  Schema.Struct({
    code: Schema.Literal("DISCORD_HTTP_ERROR"),
    details: Schema.Struct({ status: Schema.Number }),
  }),
);

function getDiscordHttpErrorStatus(
  error: DependencyUnavailableError,
): number | null {
  return Option.match(decodeDiscordHttpError(error.body), {
    onNone: () => null,
    onSome: ({ details }) => details.status,
  });
}
