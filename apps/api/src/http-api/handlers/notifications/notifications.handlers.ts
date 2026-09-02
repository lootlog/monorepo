import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import { LootlogApi } from "../../lootlog-api.generated.js";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;

export const notificationEndpointIdentifiers = [
  "NotificationsGuildControllerGetGuildTargets",
  "NotificationsGuildControllerCreateGuildTarget",
  "NotificationsGuildControllerGetAvailableGuildTargets",
  "NotificationsGuildControllerDeleteGuildTarget",
  "NotificationsGuildControllerUpdateGuildTarget",
  "NotificationsGuildControllerGetGuildRules",
  "NotificationsGuildControllerCreateGuildRule",
  "NotificationsGuildControllerDeleteGuildRule",
  "NotificationsGuildControllerUpdateGuildRule",
  "NotificationsGuildControllerRebuildGuildRuleJobs",
  "NotificationsGuildControllerTriggerGuildRuleTest",
  "NotificationsGuildControllerGetGuildJobs",
  "NotificationsGuildControllerCancelGuildJob",
  "NotificationsUserControllerGetUserTargets",
  "NotificationsUserControllerCreateUserTarget",
  "NotificationsUserControllerDeleteUserTarget",
  "NotificationsUserControllerUpdateUserTarget",
  "NotificationsUserControllerTriggerUserTargetTest",
  "NotificationsUserControllerGetUserRules",
  "NotificationsUserControllerCreateUserRule",
  "NotificationsUserControllerDeleteUserRule",
  "NotificationsUserControllerUpdateUserRule",
  "NotificationsUserControllerGetUserJobs",
  "NotificationsUserControllerGetWatchedItems",
  "NotificationsUserControllerCreateWatchedItem",
  "NotificationsUserControllerQuickAddWatchedItem",
  "NotificationsUserControllerDeleteWatchedItem",
] as const;

export type NotificationEndpointIdentifier =
  (typeof notificationEndpointIdentifiers)[number];

export interface NotificationCaller {
  readonly discordId: string;
  readonly userId: string;
}

export interface NotificationGuildCaller extends NotificationCaller {
  readonly guild: Guild;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationsAccessDenied extends Schema.TaggedError<NotificationsAccessDenied>()(
  "NotificationsAccessDenied",
  {
    status: Schema.Literals([401, 403]),
    code: Schema.String,
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationsBadRequest extends Schema.TaggedError<NotificationsBadRequest>()(
  "NotificationsBadRequest",
  { status: Schema.Literal(400), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationsNotFound extends Schema.TaggedError<NotificationsNotFound>()(
  "NotificationsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationsConflict extends Schema.TaggedError<NotificationsConflict>()(
  "NotificationsConflict",
  { status: Schema.Literal(409), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationsDataError extends Schema.TaggedError<NotificationsDataError>()(
  "NotificationsDataError",
  { cause: Schema.Defect() },
) {}

export class NotificationsAuthorization extends Context.Service<
  NotificationsAuthorization,
  {
    readonly requireCaller: Effect.Effect<
      NotificationCaller,
      NotificationsAccessDenied
    >;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly capabilities: ReadonlyArray<PermissionValue>;
      readonly mode: "any";
    }) => Effect.Effect<NotificationGuildCaller, NotificationsAccessDenied>;
  }
>()("@lootlog/api/http-api/notifications/authorization") {}

export interface NotificationRequest {
  readonly params?: Readonly<Record<string, unknown>>;
  readonly payload?: unknown;
}

type NotificationContext = NotificationCaller | NotificationGuildCaller;

export class NotificationsData extends Context.Service<
  NotificationsData,
  {
    readonly execute: (
      endpoint: NotificationEndpointIdentifier,
      request: NotificationRequest,
      caller: NotificationContext,
    ) => Effect.Effect<
      unknown,
      | NotificationsBadRequest
      | NotificationsConflict
      | NotificationsDataError
      | NotificationsNotFound
    >;
  }
>()("@lootlog/api/http-api/notifications/data") {
  static layer(service: NotificationsData["Service"]) {
    return Layer.succeed(NotificationsData, NotificationsData.of(service));
  }

  static layerLegacy(
    execute: (
      endpoint: NotificationEndpointIdentifier,
      request: NotificationRequest,
      caller: NotificationContext,
    ) => PromiseLike<unknown> | unknown,
  ) {
    return NotificationsData.layer({
      execute: (endpoint, request, caller) =>
        Effect.tryPromise({
          try: () => Promise.resolve(execute(endpoint, request, caller)),
          catch: (cause) => new NotificationsDataError({ cause }),
        }),
    });
  }
}

const isGuildEndpoint = (endpoint: NotificationEndpointIdentifier) =>
  endpoint.startsWith("NotificationsGuildController");

const requireContext = (
  endpoint: NotificationEndpointIdentifier,
  request: NotificationRequest,
) => {
  if (!isGuildEndpoint(endpoint)) {
    return Effect.flatMap(
      NotificationsAuthorization,
      (authorization) => authorization.requireCaller,
    );
  }

  const guildId = request.params?.guildId;
  if (typeof guildId !== "string") {
    return Effect.fail(
      new NotificationsAccessDenied({
        status: 403,
        code: "ORGANIZATION_SCOPE_REQUIRED",
      }),
    );
  }

  return Effect.flatMap(NotificationsAuthorization, (authorization) =>
    authorization.requireGuild({
      guildId,
      capabilities: [Permission.OWNER, Permission.ADMIN],
      mode: "any",
    }),
  );
};

export const executeNotificationEndpoint = Effect.fn("notifications.execute")(
  function* (
    endpoint: NotificationEndpointIdentifier,
    request: NotificationRequest,
  ) {
    const caller = yield* requireContext(endpoint, request);
    return yield* Effect.flatMap(NotificationsData, (notifications) =>
      notifications.execute(endpoint, request, caller),
    );
  },
);

const toHttpResponse = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => {
    if (
      error instanceof NotificationsAccessDenied ||
      error instanceof NotificationsBadRequest ||
      error instanceof NotificationsConflict ||
      error instanceof NotificationsNotFound
    ) {
      return Effect.succeed(HttpServerResponse.empty({ status: error.status }));
    }
    return Effect.die(error);
  });

const handle = (
  endpoint: NotificationEndpointIdentifier,
  request: NotificationRequest,
) =>
  toHttpResponse(
    executeNotificationEndpoint(endpoint, request),
  ) as Effect.Effect<
    never,
    never,
    NotificationsAuthorization | NotificationsData
  >;

export const NotificationsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "notifications",
  (handlers) =>
    handlers
      .handle("NotificationsGuildControllerGetGuildTargets", ({ params }) =>
        handle("NotificationsGuildControllerGetGuildTargets", { params }),
      )
      .handle(
        "NotificationsGuildControllerCreateGuildTarget",
        ({ params, payload }) =>
          handle("NotificationsGuildControllerCreateGuildTarget", {
            params,
            payload,
          }),
      )
      .handle(
        "NotificationsGuildControllerGetAvailableGuildTargets",
        ({ params }) =>
          handle("NotificationsGuildControllerGetAvailableGuildTargets", {
            params,
          }),
      )
      .handle("NotificationsGuildControllerDeleteGuildTarget", ({ params }) =>
        handle("NotificationsGuildControllerDeleteGuildTarget", { params }),
      )
      .handle(
        "NotificationsGuildControllerUpdateGuildTarget",
        ({ params, payload }) =>
          handle("NotificationsGuildControllerUpdateGuildTarget", {
            params,
            payload,
          }),
      )
      .handle("NotificationsGuildControllerGetGuildRules", ({ params }) =>
        handle("NotificationsGuildControllerGetGuildRules", { params }),
      )
      .handle(
        "NotificationsGuildControllerCreateGuildRule",
        ({ params, payload }) =>
          handle("NotificationsGuildControllerCreateGuildRule", {
            params,
            payload,
          }),
      )
      .handle("NotificationsGuildControllerDeleteGuildRule", ({ params }) =>
        handle("NotificationsGuildControllerDeleteGuildRule", { params }),
      )
      .handle(
        "NotificationsGuildControllerUpdateGuildRule",
        ({ params, payload }) =>
          handle("NotificationsGuildControllerUpdateGuildRule", {
            params,
            payload,
          }),
      )
      .handle(
        "NotificationsGuildControllerRebuildGuildRuleJobs",
        ({ params }) =>
          handle("NotificationsGuildControllerRebuildGuildRuleJobs", {
            params,
          }),
      )
      .handle(
        "NotificationsGuildControllerTriggerGuildRuleTest",
        ({ params }) =>
          handle("NotificationsGuildControllerTriggerGuildRuleTest", {
            params,
          }),
      )
      .handle("NotificationsGuildControllerGetGuildJobs", ({ params }) =>
        handle("NotificationsGuildControllerGetGuildJobs", { params }),
      )
      .handle("NotificationsGuildControllerCancelGuildJob", ({ params }) =>
        handle("NotificationsGuildControllerCancelGuildJob", { params }),
      )
      .handle("NotificationsUserControllerGetUserTargets", () =>
        handle("NotificationsUserControllerGetUserTargets", {}),
      )
      .handle("NotificationsUserControllerCreateUserTarget", ({ payload }) =>
        handle("NotificationsUserControllerCreateUserTarget", { payload }),
      )
      .handle("NotificationsUserControllerDeleteUserTarget", ({ params }) =>
        handle("NotificationsUserControllerDeleteUserTarget", { params }),
      )
      .handle(
        "NotificationsUserControllerUpdateUserTarget",
        ({ params, payload }) =>
          handle("NotificationsUserControllerUpdateUserTarget", {
            params,
            payload,
          }),
      )
      .handle(
        "NotificationsUserControllerTriggerUserTargetTest",
        ({ params }) =>
          handle("NotificationsUserControllerTriggerUserTargetTest", {
            params,
          }),
      )
      .handle("NotificationsUserControllerGetUserRules", () =>
        handle("NotificationsUserControllerGetUserRules", {}),
      )
      .handle("NotificationsUserControllerCreateUserRule", ({ payload }) =>
        handle("NotificationsUserControllerCreateUserRule", { payload }),
      )
      .handle("NotificationsUserControllerDeleteUserRule", ({ params }) =>
        handle("NotificationsUserControllerDeleteUserRule", { params }),
      )
      .handle(
        "NotificationsUserControllerUpdateUserRule",
        ({ params, payload }) =>
          handle("NotificationsUserControllerUpdateUserRule", {
            params,
            payload,
          }),
      )
      .handle("NotificationsUserControllerGetUserJobs", () =>
        handle("NotificationsUserControllerGetUserJobs", {}),
      )
      .handle("NotificationsUserControllerGetWatchedItems", () =>
        handle("NotificationsUserControllerGetWatchedItems", {}),
      )
      .handle("NotificationsUserControllerCreateWatchedItem", ({ payload }) =>
        handle("NotificationsUserControllerCreateWatchedItem", { payload }),
      )
      .handle("NotificationsUserControllerQuickAddWatchedItem", ({ payload }) =>
        handle("NotificationsUserControllerQuickAddWatchedItem", { payload }),
      )
      .handle("NotificationsUserControllerDeleteWatchedItem", ({ params }) =>
        handle("NotificationsUserControllerDeleteWatchedItem", { params }),
      ),
);
