import { Match, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class SessionNotJoined extends TaggedErrorClass<SessionNotJoined>()(
  "SessionNotJoined",
  {},
) {}

export class SubscriptionLimitExceeded extends TaggedErrorClass<SubscriptionLimitExceeded>()(
  "SubscriptionLimitExceeded",
  {},
) {}

export class OrganizationAccessDenied extends TaggedErrorClass<OrganizationAccessDenied>()(
  "OrganizationAccessDenied",
  {},
) {}

export class GameCharacterRequired extends TaggedErrorClass<GameCharacterRequired>()(
  "GameCharacterRequired",
  {},
) {}

export class NoAuthorizedOrganizations extends TaggedErrorClass<NoAuthorizedOrganizations>()(
  "NoAuthorizedOrganizations",
  {},
) {}

export class PresenceSessionMismatch extends TaggedErrorClass<PresenceSessionMismatch>()(
  "PresenceSessionMismatch",
  {},
) {}

export class PresenceNotPublished extends TaggedErrorClass<PresenceNotPublished>()(
  "PresenceNotPublished",
  {},
) {}

export class RealtimeStoreError extends TaggedErrorClass<RealtimeStoreError>()(
  "RealtimeStoreError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export class RealtimeDependencyError extends TaggedErrorClass<RealtimeDependencyError>()(
  "RealtimeDependencyError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export type CommandRejection =
  | SubscriptionLimitExceeded
  | SessionNotJoined
  | OrganizationAccessDenied
  | GameCharacterRequired
  | NoAuthorizedOrganizations
  | PresenceSessionMismatch
  | PresenceNotPublished;

export type CommandFailure =
  | CommandRejection
  | RealtimeStoreError
  | RealtimeDependencyError;

export const isCommandFailure = (error: unknown): error is CommandFailure =>
  error instanceof SubscriptionLimitExceeded ||
  error instanceof SessionNotJoined ||
  error instanceof OrganizationAccessDenied ||
  error instanceof GameCharacterRequired ||
  error instanceof NoAuthorizedOrganizations ||
  error instanceof PresenceSessionMismatch ||
  error instanceof PresenceNotPublished ||
  error instanceof RealtimeStoreError ||
  error instanceof RealtimeDependencyError;

export const commandFailureDetails = (error: CommandFailure) =>
  Match.valueTags(error, {
    SubscriptionLimitExceeded: () => ({
      message: "subscription limit exceeded",
      retryable: false,
    }),
    SessionNotJoined: () => ({
      message: "session.join is required",
      retryable: false,
    }),
    OrganizationAccessDenied: () => ({
      message: "organization access denied",
      retryable: false,
    }),
    GameCharacterRequired: () => ({
      message: "game sessions require a character",
      retryable: false,
    }),
    NoAuthorizedOrganizations: () => ({
      message: "no authorized organizations",
      retryable: false,
    }),
    PresenceSessionMismatch: () => ({
      message: "heartbeat session does not match the connection",
      retryable: false,
    }),
    PresenceNotPublished: () => ({
      message: "presence no longer has an authorized organization",
      retryable: false,
    }),
    RealtimeStoreError: () => ({
      message: "command temporarily unavailable",
      retryable: true,
    }),
    RealtimeDependencyError: () => ({
      message: "command temporarily unavailable",
      retryable: true,
    }),
  });
