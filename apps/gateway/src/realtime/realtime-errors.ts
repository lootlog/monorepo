import { ORGANIZATION_ACCESS_DENIED_MESSAGE } from "@lootlog/protocol/realtime";
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
  readonly message: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
} =>
  Match.valueTags(error, {
    JoinCapacityExceeded: ({ retryAfterMs }) => ({
      message: "gateway is busy",
      retryable: true,
      retryAfterMs,
    }),
    SubscriptionLimitExceeded: () => ({
      message: "subscription limit exceeded",
      retryable: false,
    }),
    SessionNotJoined: () => ({
      message: "session.join is required",
      retryable: false,
    }),
    OrganizationAccessDenied: () => ({
      message: ORGANIZATION_ACCESS_DENIED_MESSAGE,
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
