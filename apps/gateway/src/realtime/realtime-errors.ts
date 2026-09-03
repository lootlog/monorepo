import { Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class SessionNotJoined extends TaggedErrorClass<SessionNotJoined>()(
  "SessionNotJoined",
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

export class MargonemProofRequired extends TaggedErrorClass<MargonemProofRequired>()(
  "MargonemProofRequired",
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
  | SessionNotJoined
  | OrganizationAccessDenied
  | GameCharacterRequired
  | MargonemProofRequired
  | NoAuthorizedOrganizations
  | PresenceSessionMismatch
  | PresenceNotPublished;

export type CommandFailure =
  | CommandRejection
  | RealtimeStoreError
  | RealtimeDependencyError;

export const isCommandFailure = (error: unknown): error is CommandFailure =>
  error instanceof SessionNotJoined ||
  error instanceof OrganizationAccessDenied ||
  error instanceof GameCharacterRequired ||
  error instanceof MargonemProofRequired ||
  error instanceof NoAuthorizedOrganizations ||
  error instanceof PresenceSessionMismatch ||
  error instanceof PresenceNotPublished ||
  error instanceof RealtimeStoreError ||
  error instanceof RealtimeDependencyError;

export const commandFailureDetails = (
  error: CommandFailure,
): { readonly message: string; readonly retryable: boolean } => {
  switch (error._tag) {
    case "SessionNotJoined":
      return { message: "session.join is required", retryable: false };
    case "OrganizationAccessDenied":
      return { message: "organization access denied", retryable: false };
    case "GameCharacterRequired":
      return { message: "game sessions require a character", retryable: false };
    case "MargonemProofRequired":
      return {
        message: "Margonem account proof is required",
        retryable: false,
      };
    case "NoAuthorizedOrganizations":
      return { message: "no authorized organizations", retryable: false };
    case "PresenceSessionMismatch":
      return {
        message: "heartbeat session does not match the connection",
        retryable: false,
      };
    case "PresenceNotPublished":
      return {
        message: "presence no longer has an authorized organization",
        retryable: false,
      };
    case "RealtimeStoreError":
    case "RealtimeDependencyError":
      return { message: "command temporarily unavailable", retryable: true };
  }
};
