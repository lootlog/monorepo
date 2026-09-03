import { Context, Effect } from "effect";
import { OpenApi } from "effect/unstable/httpapi";
import type { NotificationRuleOperations } from "#src/notifications/notification-rule-operations";
import type { NotificationGuildTargets } from "#src/notifications/notification-guild-targets";
import type { NotificationUserTargets } from "#src/notifications/notification-user-targets";
import type { NotificationJobOperations } from "#src/notifications/notification-job-operations";
import type { NotificationWatchedItems } from "#src/notifications/notification-watched-items";
import type {
  CreateNotificationRuleDto,
  CreateNotificationTargetDto,
  CreateWatchedItemDto,
  CreateWatchedItemQuickAddDto,
  UpdateNotificationRuleDto,
  UpdateNotificationTargetDto,
} from "#src/http-api/lootlog-api";
import {
  GuildAvailableNotificationTargetsResponse,
  GuildNotificationRulesResponse,
  NotificationJobsResponse,
  NotificationRuleResponse,
  NotificationTargetResponse,
  NotificationTargetWithTestTriggerResponse,
  WatchedItemResponse,
} from "#src/notifications/notification-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { applicationErrorStatusOrUndefined } from "#src/shared/http/http-errors";
import { LootlogApi } from "../../lootlog-api.js";
import {
  NotificationsAccessDenied,
  NotificationsBadRequest,
  NotificationsConflict,
  NotificationsData,
  NotificationsDataError,
  NotificationsNotFound,
  type NotificationCaller,
  type NotificationEndpointIdentifier,
  type NotificationGuildCaller,
  type NotificationRequest,
} from "./notifications.handlers.js";

export interface NotificationDataServices {
  readonly guildTargets: NotificationGuildTargets;
  readonly userTargets: NotificationUserTargets;
  readonly jobOperations: NotificationJobOperations;
  readonly rules: NotificationRuleOperations;
  readonly watchedItems: NotificationWatchedItems;
}

type NotificationContext = NotificationCaller | NotificationGuildCaller;
type NotificationFailure =
  | NotificationsAccessDenied
  | NotificationsBadRequest
  | NotificationsConflict
  | NotificationsDataError
  | NotificationsNotFound;

const operationIds = Object.fromEntries(
  Object.entries(LootlogApi.groups.notifications.endpoints).map(
    ([identifier, endpoint]) => [
      identifier,
      Context.getOrUndefined(endpoint.annotations, OpenApi.Identifier) ??
        identifier,
    ],
  ),
) as Record<NotificationEndpointIdentifier, string>;

const operationFailure = (cause: unknown): NotificationFailure => {
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

const requireGuildCaller = (
  caller: NotificationContext,
): Effect.Effect<NotificationGuildCaller, NotificationsAccessDenied> =>
  "guild" in caller
    ? Effect.succeed(caller)
    : Effect.fail(
        new NotificationsAccessDenied({
          status: 403,
          code: "ORGANIZATION_SCOPE_REQUIRED",
        }),
      );

const requireIntegerParameter = (request: NotificationRequest, key: string) => {
  const value = request.params?.[key];
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

const requireStringParameter = (request: NotificationRequest, key: string) => {
  const value = request.params?.[key];
  return typeof value === "string" && value.length > 0
    ? Effect.succeed(value)
    : Effect.fail(
        new NotificationsBadRequest({
          status: 400,
          code: `INVALID_${key.toUpperCase()}`,
        }),
      );
};

export const notificationDataLayer = (services: NotificationDataServices) =>
  NotificationsData.layer({
    execute: (endpoint, request, caller) =>
      // oxlint-disable-next-line eslint/complexity -- Exhaustive operation dispatch keeps every generated endpoint explicit and type-checked.
      Effect.gen(function* () {
        if (endpoint.startsWith("NotificationsGuildController")) {
          const guildCaller = yield* requireGuildCaller(caller);
          const guildId = guildCaller.guild.id;

          switch (endpoint) {
            case "NotificationsGuildControllerGetGuildTargets":
              return yield* operation(
                endpoint,
                services.guildTargets.list(guildId),
              ).pipe(
                Effect.map((targets) =>
                  targets.map((target) =>
                    encodeUnknownResponse(NotificationTargetResponse, target),
                  ),
                ),
              );
            case "NotificationsGuildControllerGetAvailableGuildTargets":
              return yield* operation(
                endpoint,
                services.guildTargets.available(guildId),
              ).pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(
                    GuildAvailableNotificationTargetsResponse,
                    value,
                  ),
                ),
              );
            case "NotificationsGuildControllerCreateGuildTarget":
              return yield* operation(
                endpoint,
                services.guildTargets.create(
                  guildId,
                  request.payload as CreateNotificationTargetDto,
                ),
              ).pipe(
                Effect.map((target) =>
                  encodeUnknownResponse(NotificationTargetResponse, target),
                ),
              );
            case "NotificationsGuildControllerUpdateGuildTarget": {
              const targetId = yield* requireIntegerParameter(
                request,
                "targetId",
              );
              return yield* operation(
                endpoint,
                services.guildTargets.update(
                  guildId,
                  targetId,
                  request.payload as UpdateNotificationTargetDto,
                ),
              ).pipe(
                Effect.map((target) =>
                  encodeUnknownResponse(NotificationTargetResponse, target),
                ),
              );
            }
            case "NotificationsGuildControllerDeleteGuildTarget": {
              const targetId = yield* requireIntegerParameter(
                request,
                "targetId",
              );
              return yield* operation(
                endpoint,
                services.guildTargets.remove(guildId, targetId),
              );
            }
            case "NotificationsGuildControllerGetGuildRules":
              return yield* operation(
                endpoint,
                services.rules.listGuild(guildId),
              ).pipe(
                Effect.map((value) =>
                  encodeUnknownResponse(GuildNotificationRulesResponse, value),
                ),
              );
            case "NotificationsGuildControllerCreateGuildRule":
              return yield* operation(
                endpoint,
                services.rules.createGuild(
                  guildId,
                  request.payload as CreateNotificationRuleDto,
                ),
              ).pipe(
                Effect.map((rule) =>
                  encodeUnknownResponse(NotificationRuleResponse, rule),
                ),
              );
            case "NotificationsGuildControllerUpdateGuildRule": {
              const ruleId = yield* requireIntegerParameter(request, "ruleId");
              return yield* operation(
                endpoint,
                services.rules.updateGuild(
                  guildId,
                  ruleId,
                  request.payload as UpdateNotificationRuleDto,
                ),
              ).pipe(
                Effect.map((rule) =>
                  encodeUnknownResponse(NotificationRuleResponse, rule),
                ),
              );
            }
            case "NotificationsGuildControllerDeleteGuildRule": {
              const ruleId = yield* requireIntegerParameter(request, "ruleId");
              return yield* operation(
                endpoint,
                services.rules.deleteGuild(guildId, ruleId),
              );
            }
            case "NotificationsGuildControllerRebuildGuildRuleJobs": {
              const ruleId = yield* requireIntegerParameter(request, "ruleId");
              return yield* operation(
                endpoint,
                services.rules.rebuildGuildJobs(guildId, ruleId),
              );
            }
            case "NotificationsGuildControllerTriggerGuildRuleTest": {
              const ruleId = yield* requireIntegerParameter(request, "ruleId");
              return yield* operation(
                endpoint,
                services.rules.testGuild(guildId, ruleId),
              );
            }
            case "NotificationsGuildControllerGetGuildJobs":
              return yield* operation(
                endpoint,
                services.jobOperations.listGuild(guildId),
              ).pipe(
                Effect.map((jobs) =>
                  encodeUnknownResponse(NotificationJobsResponse, jobs),
                ),
              );
            case "NotificationsGuildControllerCancelGuildJob": {
              const jobId = yield* requireStringParameter(request, "jobId");
              return yield* operation(
                endpoint,
                services.jobOperations.cancelGuild(guildId, jobId),
              );
            }
          }
        }

        const discordId = caller.discordId;
        switch (endpoint) {
          case "NotificationsUserControllerGetUserTargets":
            return yield* operation(
              endpoint,
              services.userTargets.list(discordId),
            ).pipe(
              Effect.map((targets) =>
                targets.map((target) =>
                  encodeUnknownResponse(
                    NotificationTargetWithTestTriggerResponse,
                    target,
                  ),
                ),
              ),
            );
          case "NotificationsUserControllerCreateUserTarget":
            return yield* operation(
              endpoint,
              services.userTargets.create(
                discordId,
                request.payload as CreateNotificationTargetDto,
              ),
            ).pipe(
              Effect.map((target) =>
                encodeUnknownResponse(NotificationTargetResponse, target),
              ),
            );
          case "NotificationsUserControllerUpdateUserTarget": {
            const targetId = yield* requireIntegerParameter(
              request,
              "targetId",
            );
            return yield* operation(
              endpoint,
              services.userTargets.update(
                discordId,
                targetId,
                request.payload as UpdateNotificationTargetDto,
              ),
            ).pipe(
              Effect.map((target) =>
                encodeUnknownResponse(NotificationTargetResponse, target),
              ),
            );
          }
          case "NotificationsUserControllerTriggerUserTargetTest": {
            const targetId = yield* requireIntegerParameter(
              request,
              "targetId",
            );
            return yield* operation(
              endpoint,
              services.userTargets.triggerTest(discordId, targetId),
            );
          }
          case "NotificationsUserControllerDeleteUserTarget": {
            const targetId = yield* requireIntegerParameter(
              request,
              "targetId",
            );
            return yield* operation(
              endpoint,
              services.userTargets.remove(discordId, targetId),
            );
          }
          case "NotificationsUserControllerGetUserRules":
            return yield* operation(
              endpoint,
              services.rules.listUser(discordId),
            ).pipe(
              Effect.map((rules) =>
                rules.map((rule) =>
                  encodeUnknownResponse(NotificationRuleResponse, rule),
                ),
              ),
            );
          case "NotificationsUserControllerCreateUserRule":
            return yield* operation(
              endpoint,
              services.rules.createUser(
                discordId,
                request.payload as CreateNotificationRuleDto,
              ),
            ).pipe(
              Effect.map((rule) =>
                encodeUnknownResponse(NotificationRuleResponse, rule),
              ),
            );
          case "NotificationsUserControllerUpdateUserRule": {
            const ruleId = yield* requireIntegerParameter(request, "ruleId");
            return yield* operation(
              endpoint,
              services.rules.updateUser(
                discordId,
                ruleId,
                request.payload as UpdateNotificationRuleDto,
              ),
            ).pipe(
              Effect.map((rule) =>
                encodeUnknownResponse(NotificationRuleResponse, rule),
              ),
            );
          }
          case "NotificationsUserControllerDeleteUserRule": {
            const ruleId = yield* requireIntegerParameter(request, "ruleId");
            return yield* operation(
              endpoint,
              services.rules.deleteUser(discordId, ruleId),
            );
          }
          case "NotificationsUserControllerGetUserJobs":
            return yield* operation(
              endpoint,
              services.jobOperations.listUser(discordId),
            ).pipe(
              Effect.map((jobs) =>
                encodeUnknownResponse(NotificationJobsResponse, jobs),
              ),
            );
          case "NotificationsUserControllerGetWatchedItems":
            return yield* operation(
              endpoint,
              services.watchedItems.list(discordId),
            ).pipe(
              Effect.map((items) =>
                items.map((item) =>
                  encodeUnknownResponse(WatchedItemResponse, item),
                ),
              ),
            );
          case "NotificationsUserControllerCreateWatchedItem":
            return yield* operation(
              endpoint,
              services.watchedItems.create(
                discordId,
                caller.userId,
                request.payload as CreateWatchedItemDto,
              ),
            ).pipe(
              Effect.map((item) =>
                encodeUnknownResponse(WatchedItemResponse, item),
              ),
            );
          case "NotificationsUserControllerQuickAddWatchedItem":
            return yield* operation(
              endpoint,
              services.watchedItems.quickAdd(
                discordId,
                caller.userId,
                request.payload as CreateWatchedItemQuickAddDto,
              ),
            ).pipe(
              Effect.map((item) =>
                encodeUnknownResponse(WatchedItemResponse, item),
              ),
            );
          case "NotificationsUserControllerDeleteWatchedItem": {
            const watchedItemId = yield* requireIntegerParameter(
              request,
              "watchedItemId",
            );
            return yield* operation(
              endpoint,
              services.watchedItems.remove(discordId, watchedItemId),
            );
          }
        }
      }),
  });
