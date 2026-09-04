import type { AccessPolicy } from "@lootlog/domain/access-policy";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import { Context, Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, OpenApi } from "effect/unstable/httpapi";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import {
  GuildAvailableNotificationTargetsResponse,
  GuildNotificationRulesResponse,
  NotificationJobsResponse,
  NotificationRuleResponse,
  NotificationTargetResponse,
  NotificationTargetWithTestTriggerResponse,
  WatchedItemResponse,
} from "#src/notifications/notification-response.schema";
import { applicationErrorStatusOrUndefined } from "#src/shared/http/http-errors";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { LootlogApi } from "../../lootlog-api.js";
import { NotificationOperations } from "./notifications.data-layer.js";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;
type NotificationEndpointIdentifier =
  keyof typeof LootlogApi.groups.notifications.endpoints;

export interface NotificationCaller {
  readonly discordId: string;
  readonly userId: string;
}

export interface NotificationGuildCaller extends NotificationCaller {
  readonly guild: Guild;
  readonly accessPolicy: AccessPolicy;
  readonly roles: ReadonlyArray<Role>;
}

export class NotificationsAccessDenied extends TaggedErrorClass<NotificationsAccessDenied>()(
  "NotificationsAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

class NotificationsBadRequest extends TaggedErrorClass<NotificationsBadRequest>()(
  "NotificationsBadRequest",
  { status: Schema.Literal(400), code: Schema.String },
) {}

export class NotificationsNotFound extends TaggedErrorClass<NotificationsNotFound>()(
  "NotificationsNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

class NotificationsConflict extends TaggedErrorClass<NotificationsConflict>()(
  "NotificationsConflict",
  { status: Schema.Literal(409), code: Schema.String },
) {}

class NotificationsDataError extends TaggedErrorClass<NotificationsDataError>()(
  "NotificationsDataError",
  { cause: Schema.Defect() },
) {}

type NotificationsHttpFailure =
  | NotificationsAccessDenied
  | NotificationsBadRequest
  | NotificationsConflict
  | NotificationsDataError
  | NotificationsNotFound;

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
    }) => Effect.Effect<
      NotificationGuildCaller,
      NotificationsAccessDenied | NotificationsNotFound
    >;
  }
>()("@lootlog/api/http-api/notifications/authorization") {}

const operationIds = Object.fromEntries(
  Object.entries(LootlogApi.groups.notifications.endpoints).map(
    ([identifier, endpoint]) => [
      identifier,
      Context.getOrUndefined(endpoint.annotations, OpenApi.Identifier) ??
        identifier,
    ],
  ),
) as Record<NotificationEndpointIdentifier, string>;

const operationFailure = (cause: unknown): NotificationsHttpFailure => {
  if (
    cause instanceof NotificationsAccessDenied ||
    cause instanceof NotificationsBadRequest ||
    cause instanceof NotificationsConflict ||
    cause instanceof NotificationsDataError ||
    cause instanceof NotificationsNotFound
  ) {
    return cause;
  }
  const status = applicationErrorStatusOrUndefined(cause);
  if (status === 400) {
    return new NotificationsBadRequest({ status, code: "BAD_REQUEST" });
  }
  if (status === 403) {
    return new NotificationsAccessDenied({ status, code: "FORBIDDEN" });
  }
  if (status === 404) {
    return new NotificationsNotFound({ status, code: "NOT_FOUND" });
  }
  if (status === 409) {
    return new NotificationsConflict({ status, code: "CONFLICT" });
  }
  return new NotificationsDataError({ cause });
};

const operation = <A>(
  endpoint: NotificationEndpointIdentifier,
  effect: Effect.Effect<A, unknown>,
) =>
  effect.pipe(
    Effect.mapError(operationFailure),
    Effect.withSpan(operationIds[endpoint], {
      attributes: { adapter: "notifications", retryCount: 0 },
    }),
  );

const statusResponse = (error: { readonly status: number }) =>
  Effect.succeed(HttpServerResponse.empty({ status: error.status }));

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, NotificationsHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    NotificationsAccessDenied: statusResponse,
    NotificationsBadRequest: statusResponse,
    NotificationsConflict: statusResponse,
    NotificationsDataError: (error) => Effect.die(error.cause),
    NotificationsNotFound: statusResponse,
  });

const integerParameter = (value: unknown, key: string) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? Effect.succeed(parsed)
    : Effect.fail(
        new NotificationsBadRequest({
          status: 400,
          code: `INVALID_${key.toUpperCase()}`,
        }),
      );
};

export const NotificationsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "notifications",
  Effect.fn(function* (handlers) {
    const authorization = yield* NotificationsAuthorization;
    const services = yield* NotificationOperations;

    const user = <A>(
      endpoint: NotificationEndpointIdentifier,
      run: (caller: NotificationCaller) => Effect.Effect<A, unknown>,
    ) =>
      toHttpResponse(
        Effect.flatMap(authorization.requireCaller, (caller) =>
          operation(endpoint, run(caller)),
        ),
      ) as Effect.Effect<never, never>;

    const guild = <A>(
      endpoint: NotificationEndpointIdentifier,
      guildId: unknown,
      run: (caller: NotificationGuildCaller) => Effect.Effect<A, unknown>,
    ) => {
      const caller =
        typeof guildId === "string"
          ? authorization.requireGuild({
              guildId,
              capabilities: [Permission.OWNER, Permission.ADMIN],
              mode: "any",
            })
          : Effect.fail(
              new NotificationsAccessDenied({
                status: 403,
                code: "ORGANIZATION_SCOPE_REQUIRED",
              }),
            );
      return toHttpResponse(
        Effect.flatMap(caller, (authorized) =>
          operation(endpoint, run(authorized)),
        ),
      ) as Effect.Effect<never, never>;
    };

    return handlers.handleAll({
      NotificationsGuildControllerGetGuildTargets: ({ params }) =>
        guild(
          "NotificationsGuildControllerGetGuildTargets",
          params.guildId,
          ({ guild: currentGuild }) =>
            services.guildTargets
              .list(currentGuild.id)
              .pipe(
                Effect.map((targets) =>
                  targets.map((target) =>
                    encodeUnknownResponse(NotificationTargetResponse, target),
                  ),
                ),
              ),
        ),
      NotificationsGuildControllerGetAvailableGuildTargets: ({ params }) =>
        guild(
          "NotificationsGuildControllerGetAvailableGuildTargets",
          params.guildId,
          ({ guild: currentGuild }) =>
            services.guildTargets
              .available(currentGuild.id)
              .pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(
                    GuildAvailableNotificationTargetsResponse,
                    value,
                  ),
                ),
              ),
        ),
      NotificationsGuildControllerCreateGuildTarget: ({ params, payload }) =>
        guild(
          "NotificationsGuildControllerCreateGuildTarget",
          params.guildId,
          ({ guild: currentGuild }) =>
            services.guildTargets
              .create(currentGuild.id, payload)
              .pipe(
                Effect.map((target) =>
                  encodeUnknownResponse(NotificationTargetResponse, target),
                ),
              ),
        ),
      NotificationsGuildControllerUpdateGuildTarget: ({ params, payload }) =>
        guild(
          "NotificationsGuildControllerUpdateGuildTarget",
          params.guildId,
          ({ guild: currentGuild }) =>
            Effect.flatMap(
              integerParameter(params.targetId, "targetId"),
              (id) =>
                services.guildTargets.update(currentGuild.id, id, payload),
            ).pipe(
              Effect.map((target) =>
                encodeUnknownResponse(NotificationTargetResponse, target),
              ),
            ),
        ),
      NotificationsGuildControllerDeleteGuildTarget: ({ params }) =>
        guild(
          "NotificationsGuildControllerDeleteGuildTarget",
          params.guildId,
          ({ guild: currentGuild }) =>
            Effect.flatMap(
              integerParameter(params.targetId, "targetId"),
              (id) => services.guildTargets.remove(currentGuild.id, id),
            ),
        ),
      NotificationsGuildControllerGetGuildRules: ({ params }) =>
        guild(
          "NotificationsGuildControllerGetGuildRules",
          params.guildId,
          ({ guild: currentGuild }) =>
            services.rules
              .listGuild(currentGuild.id)
              .pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(GuildNotificationRulesResponse, value),
                ),
              ),
        ),
      NotificationsGuildControllerCreateGuildRule: ({ params, payload }) =>
        guild(
          "NotificationsGuildControllerCreateGuildRule",
          params.guildId,
          ({ guild: currentGuild }) =>
            services.rules
              .createGuild(currentGuild.id, payload)
              .pipe(
                Effect.map((rule) =>
                  encodeUnknownResponse(NotificationRuleResponse, rule),
                ),
              ),
        ),
      NotificationsGuildControllerUpdateGuildRule: ({ params, payload }) =>
        guild(
          "NotificationsGuildControllerUpdateGuildRule",
          params.guildId,
          ({ guild: currentGuild }) =>
            Effect.flatMap(integerParameter(params.ruleId, "ruleId"), (id) =>
              services.rules.updateGuild(currentGuild.id, id, payload),
            ).pipe(
              Effect.map((rule) =>
                encodeUnknownResponse(NotificationRuleResponse, rule),
              ),
            ),
        ),
      NotificationsGuildControllerDeleteGuildRule: ({ params }) =>
        guild(
          "NotificationsGuildControllerDeleteGuildRule",
          params.guildId,
          ({ guild: currentGuild }) =>
            Effect.flatMap(integerParameter(params.ruleId, "ruleId"), (id) =>
              services.rules.deleteGuild(currentGuild.id, id),
            ),
        ),
      NotificationsGuildControllerRebuildGuildRuleJobs: ({ params }) =>
        guild(
          "NotificationsGuildControllerRebuildGuildRuleJobs",
          params.guildId,
          ({ guild: currentGuild }) =>
            Effect.flatMap(integerParameter(params.ruleId, "ruleId"), (id) =>
              services.rules.rebuildGuildJobs(currentGuild.id, id),
            ),
        ),
      NotificationsGuildControllerTriggerGuildRuleTest: ({ params }) =>
        guild(
          "NotificationsGuildControllerTriggerGuildRuleTest",
          params.guildId,
          ({ guild: currentGuild }) =>
            Effect.flatMap(integerParameter(params.ruleId, "ruleId"), (id) =>
              services.rules.testGuild(currentGuild.id, id),
            ),
        ),
      NotificationsGuildControllerGetGuildJobs: ({ params }) =>
        guild(
          "NotificationsGuildControllerGetGuildJobs",
          params.guildId,
          ({ guild: currentGuild }) =>
            services.jobOperations
              .listGuild(currentGuild.id)
              .pipe(
                Effect.map((jobs) =>
                  encodeUnknownResponse(NotificationJobsResponse, jobs),
                ),
              ),
        ),
      NotificationsGuildControllerCancelGuildJob: ({ params }) =>
        guild(
          "NotificationsGuildControllerCancelGuildJob",
          params.guildId,
          ({ guild: currentGuild }) =>
            services.jobOperations.cancelGuild(currentGuild.id, params.jobId),
        ),
      NotificationsUserControllerGetUserTargets: () =>
        user("NotificationsUserControllerGetUserTargets", (caller) =>
          services.userTargets
            .list(caller.discordId)
            .pipe(
              Effect.map((targets) =>
                targets.map((target) =>
                  encodeUnknownResponse(
                    NotificationTargetWithTestTriggerResponse,
                    target,
                  ),
                ),
              ),
            ),
        ),
      NotificationsUserControllerCreateUserTarget: ({ payload }) =>
        user("NotificationsUserControllerCreateUserTarget", (caller) =>
          services.userTargets
            .create(caller.discordId, payload)
            .pipe(
              Effect.map((target) =>
                encodeUnknownResponse(NotificationTargetResponse, target),
              ),
            ),
        ),
      NotificationsUserControllerUpdateUserTarget: ({ params, payload }) =>
        user("NotificationsUserControllerUpdateUserTarget", (caller) =>
          Effect.flatMap(integerParameter(params.targetId, "targetId"), (id) =>
            services.userTargets.update(caller.discordId, id, payload),
          ).pipe(
            Effect.map((target) =>
              encodeUnknownResponse(NotificationTargetResponse, target),
            ),
          ),
        ),
      NotificationsUserControllerTriggerUserTargetTest: ({ params }) =>
        user("NotificationsUserControllerTriggerUserTargetTest", (caller) =>
          Effect.flatMap(integerParameter(params.targetId, "targetId"), (id) =>
            services.userTargets.triggerTest(caller.discordId, id),
          ),
        ),
      NotificationsUserControllerDeleteUserTarget: ({ params }) =>
        user("NotificationsUserControllerDeleteUserTarget", (caller) =>
          Effect.flatMap(integerParameter(params.targetId, "targetId"), (id) =>
            services.userTargets.remove(caller.discordId, id),
          ),
        ),
      NotificationsUserControllerGetUserRules: () =>
        user("NotificationsUserControllerGetUserRules", (caller) =>
          services.rules
            .listUser(caller.discordId)
            .pipe(
              Effect.map((rules) =>
                rules.map((rule) =>
                  encodeUnknownResponse(NotificationRuleResponse, rule),
                ),
              ),
            ),
        ),
      NotificationsUserControllerCreateUserRule: ({ payload }) =>
        user("NotificationsUserControllerCreateUserRule", (caller) =>
          services.rules
            .createUser(caller.discordId, payload)
            .pipe(
              Effect.map((rule) =>
                encodeUnknownResponse(NotificationRuleResponse, rule),
              ),
            ),
        ),
      NotificationsUserControllerUpdateUserRule: ({ params, payload }) =>
        user("NotificationsUserControllerUpdateUserRule", (caller) =>
          Effect.flatMap(integerParameter(params.ruleId, "ruleId"), (id) =>
            services.rules.updateUser(caller.discordId, id, payload),
          ).pipe(
            Effect.map((rule) =>
              encodeUnknownResponse(NotificationRuleResponse, rule),
            ),
          ),
        ),
      NotificationsUserControllerDeleteUserRule: ({ params }) =>
        user("NotificationsUserControllerDeleteUserRule", (caller) =>
          Effect.flatMap(integerParameter(params.ruleId, "ruleId"), (id) =>
            services.rules.deleteUser(caller.discordId, id),
          ),
        ),
      NotificationsUserControllerGetUserJobs: () =>
        user("NotificationsUserControllerGetUserJobs", (caller) =>
          services.jobOperations
            .listUser(caller.discordId)
            .pipe(
              Effect.map((jobs) =>
                encodeUnknownResponse(NotificationJobsResponse, jobs),
              ),
            ),
        ),
      NotificationsUserControllerGetWatchedItems: () =>
        user("NotificationsUserControllerGetWatchedItems", (caller) =>
          services.watchedItems
            .list(caller.discordId)
            .pipe(
              Effect.map((items) =>
                items.map((item) =>
                  encodeUnknownResponse(WatchedItemResponse, item),
                ),
              ),
            ),
        ),
      NotificationsUserControllerCreateWatchedItem: ({ payload }) =>
        user("NotificationsUserControllerCreateWatchedItem", (caller) =>
          services.watchedItems
            .create(caller.discordId, caller.userId, payload)
            .pipe(
              Effect.map((item) =>
                encodeUnknownResponse(WatchedItemResponse, item),
              ),
            ),
        ),
      NotificationsUserControllerQuickAddWatchedItem: ({ payload }) =>
        user("NotificationsUserControllerQuickAddWatchedItem", (caller) =>
          services.watchedItems
            .quickAdd(caller.discordId, caller.userId, payload)
            .pipe(
              Effect.map((item) =>
                encodeUnknownResponse(WatchedItemResponse, item),
              ),
            ),
        ),
      NotificationsUserControllerDeleteWatchedItem: ({ params }) =>
        user("NotificationsUserControllerDeleteWatchedItem", (caller) =>
          Effect.flatMap(
            integerParameter(params.watchedItemId, "watchedItemId"),
            (id) => services.watchedItems.remove(caller.discordId, id),
          ),
        ),
    });
  }),
);
