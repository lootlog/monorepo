import {
  REALTIME_ERROR_REASONS,
  type RealtimeErrorReason,
} from "@lootlog/protocol/realtime";
import { Effect, Match, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class SessionNotJoined extends TaggedErrorClass<
  SessionNotJoined,
  { readonly brand: unique symbol }
>()("SessionNotJoined", {}) {}

export class SubscriptionLimitExceeded extends TaggedErrorClass<
  SubscriptionLimitExceeded,
  { readonly brand: unique symbol }
>()("SubscriptionLimitExceeded", {}) {}

export class OrganizationAccessDenied extends TaggedErrorClass<
  OrganizationAccessDenied,
  { readonly brand: unique symbol }
>()("OrganizationAccessDenied", {}) {}

export class GameCharacterRequired extends TaggedErrorClass<
  GameCharacterRequired,
  { readonly brand: unique symbol }
>()("GameCharacterRequired", {}) {}

export class NoAuthorizedOrganizations extends TaggedErrorClass<
  NoAuthorizedOrganizations,
  { readonly brand: unique symbol }
>()("NoAuthorizedOrganizations", {}) {}

export class JoinCapacityExceeded extends TaggedErrorClass<
  JoinCapacityExceeded,
  { readonly brand: unique symbol }
>()("JoinCapacityExceeded", { retryAfterMs: Schema.Finite }) {}

export class PresenceSessionMismatch extends TaggedErrorClass<
  PresenceSessionMismatch,
  { readonly brand: unique symbol }
>()("PresenceSessionMismatch", {}) {}

export class PresenceNotPublished extends TaggedErrorClass<
  PresenceNotPublished,
  { readonly brand: unique symbol }
>()("PresenceNotPublished", {}) {}

export class RealtimeStoreError extends TaggedErrorClass<
  RealtimeStoreError,
  { readonly brand: unique symbol }
>()("RealtimeStoreError", {
  operation: Schema.String,
  cause: Schema.Defect(),
}) {}

export const storeCall = <A>(
  operation: string,
  evaluate: () => Promise<A>,
): Effect.Effect<A, RealtimeStoreError> =>
  Effect.tryPromise({
    try: evaluate,
    catch: (cause) => new RealtimeStoreError({ operation, cause }),
  });

export class RealtimeDependencyError extends TaggedErrorClass<
  RealtimeDependencyError,
  { readonly brand: unique symbol }
>()("RealtimeDependencyError", {
  operation: Schema.String,
  cause: Schema.Defect(),
}) {}

type CommandRejection =
  | JoinCapacityExceeded
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
  error instanceof JoinCapacityExceeded ||
  error instanceof SubscriptionLimitExceeded ||
  error instanceof SessionNotJoined ||
  error instanceof OrganizationAccessDenied ||
  error instanceof GameCharacterRequired ||
  error instanceof NoAuthorizedOrganizations ||
  error instanceof PresenceSessionMismatch ||
  error instanceof PresenceNotPublished ||
  error instanceof RealtimeStoreError ||
  error instanceof RealtimeDependencyError;

export const commandFailureDetails = (
  error: CommandFailure,
): {
  readonly reason: RealtimeErrorReason;
  readonly message: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
} =>
  Match.valueTags(error, {
    JoinCapacityExceeded: ({ retryAfterMs }) => ({
      reason: REALTIME_ERROR_REASONS.gatewayBusy,
      message: "gateway is busy",
      retryable: true,
      retryAfterMs,
    }),
    SubscriptionLimitExceeded: () => ({
      reason: REALTIME_ERROR_REASONS.subscriptionLimit,
      message: "subscription limit exceeded",
      retryable: false,
    }),
    SessionNotJoined: () => ({
      reason: REALTIME_ERROR_REASONS.sessionNotJoined,
      message: "session.join is required",
      retryable: false,
    }),
    OrganizationAccessDenied: () => ({
      reason: REALTIME_ERROR_REASONS.organizationAccessDenied,
      message: "organization access denied",
      retryable: false,
    }),
    GameCharacterRequired: () => ({
      reason: REALTIME_ERROR_REASONS.characterRequired,
      message: "game sessions require a character",
      retryable: false,
    }),
    NoAuthorizedOrganizations: () => ({
      reason: REALTIME_ERROR_REASONS.noAuthorizedOrganizations,
      message: "no authorized organizations",
      retryable: false,
    }),
    PresenceSessionMismatch: () => ({
      reason: REALTIME_ERROR_REASONS.presenceSessionMismatch,
      message: "heartbeat session does not match the connection",
      retryable: false,
    }),
    PresenceNotPublished: () => ({
      reason: REALTIME_ERROR_REASONS.presenceNotPublished,
      message: "presence no longer has an authorized organization",
      retryable: false,
    }),
    RealtimeStoreError: () => ({
      reason: REALTIME_ERROR_REASONS.temporarilyUnavailable,
      message: "command temporarily unavailable",
      retryable: true,
    }),
    RealtimeDependencyError: () => ({
      reason: REALTIME_ERROR_REASONS.temporarilyUnavailable,
      message: "command temporarily unavailable",
      retryable: true,
    }),
  });
