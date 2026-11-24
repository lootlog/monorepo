import { HttpErrorResponse } from "@lootlog/protocol/http/errors";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import { SuccessResponse } from "#src/contracts/shared";
import {
  OrganizationNotificationJobParams,
  NotificationRuleResponse,
  OrganizationNotificationParams,
  CreateNotificationRuleRequest,
  NotificationTargetResponse,
  CreateNotificationTargetRequest,
  OrganizationNotificationRuleParams,
  OrganizationNotificationTargetParams,
  AvailableOrganizationNotificationTargetsResponse,
  NotificationJobsResponse,
  OrganizationNotificationRulesResponse,
  OrganizationNotificationTargetsResponse,
  UpdateNotificationRuleRequest,
  UpdateNotificationTargetRequest,
  WatchedItemResponse,
  CreateWatchedItemRequest,
  NotificationRuleParams,
  NotificationTargetParams,
  WatchedItemParams,
  NotificationRulesResponse,
  UserNotificationTargetsResponse,
  WatchedItemsResponse,
  QuickAddWatchedItemRequest,
} from "./schemas.js";

export class NotificationsGroup extends HttpApiGroup.make("notifications").add(
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetGuildTargets",
    "/guilds/:guildId/notifications/targets",
    {
      params: OrganizationNotificationParams,
      success: OrganizationNotificationTargetsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_getGuildTargets",
    )
    .annotate(OpenApi.Summary, "Get guild notification targets"),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerCreateGuildTarget",
    "/guilds/:guildId/notifications/targets",
    {
      params: OrganizationNotificationParams,
      payload: CreateNotificationTargetRequest,
      success: NotificationTargetResponse.pipe(HttpApiSchema.status(201)),
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(400))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_createGuildTarget",
    )
    .annotate(
      OpenApi.Summary,
      "Create or reactivate guild notification target",
    ),
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetAvailableGuildTargets",
    "/guilds/:guildId/notifications/targets/available",
    {
      params: OrganizationNotificationParams,
      success: AvailableOrganizationNotificationTargetsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_getAvailableGuildTargets",
    )
    .annotate(OpenApi.Summary, "Get available guild notification targets")
    .annotate(
      OpenApi.Description,
      "Discord channels that can be chosen as targets.",
    ),
  HttpApiEndpoint.delete(
    "NotificationsGuildControllerDeleteGuildTarget",
    "/guilds/:guildId/notifications/targets/:targetId",
    {
      params: OrganizationNotificationTargetParams,
      success: SuccessResponse,
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_deleteGuildTarget",
    )
    .annotate(OpenApi.Summary, "Delete guild notification target"),
  HttpApiEndpoint.patch(
    "NotificationsGuildControllerUpdateGuildTarget",
    "/guilds/:guildId/notifications/targets/:targetId",
    {
      params: OrganizationNotificationTargetParams,
      payload: UpdateNotificationTargetRequest,
      success: NotificationTargetResponse,
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_updateGuildTarget",
    )
    .annotate(OpenApi.Summary, "Update guild notification target"),
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetGuildRules",
    "/guilds/:guildId/notifications/rules",
    {
      params: OrganizationNotificationParams,
      success: OrganizationNotificationRulesResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsGuildController_getGuildRules")
    .annotate(OpenApi.Summary, "Get guild notification rules"),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerCreateGuildRule",
    "/guilds/:guildId/notifications/rules",
    {
      params: OrganizationNotificationParams,
      payload: CreateNotificationRuleRequest,
      success: NotificationRuleResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_createGuildRule",
    )
    .annotate(OpenApi.Summary, "Create guild notification rule"),
  HttpApiEndpoint.delete(
    "NotificationsGuildControllerDeleteGuildRule",
    "/guilds/:guildId/notifications/rules/:ruleId",
    {
      params: OrganizationNotificationRuleParams,
      success: SuccessResponse,
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_deleteGuildRule",
    )
    .annotate(OpenApi.Summary, "Delete guild notification rule"),
  HttpApiEndpoint.patch(
    "NotificationsGuildControllerUpdateGuildRule",
    "/guilds/:guildId/notifications/rules/:ruleId",
    {
      params: OrganizationNotificationRuleParams,
      payload: UpdateNotificationRuleRequest,
      success: NotificationRuleResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_updateGuildRule",
    )
    .annotate(OpenApi.Summary, "Update guild notification rule"),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerRebuildGuildRuleJobs",
    "/guilds/:guildId/notifications/rules/:ruleId/rebuild-jobs",
    {
      params: OrganizationNotificationRuleParams,
      success: SuccessResponse.pipe(HttpApiSchema.status(201)),
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_rebuildGuildRuleJobs",
    )
    .annotate(OpenApi.Summary, "Rebuild guild notification jobs")
    .annotate(OpenApi.Description, "Rebuilds the pending jobs of one rule."),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerTriggerGuildRuleTest",
    "/guilds/:guildId/notifications/rules/:ruleId/test",
    {
      params: OrganizationNotificationRuleParams,
      success: SuccessResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_triggerGuildRuleTest",
    )
    .annotate(OpenApi.Summary, "Trigger guild notification rule test"),
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetGuildJobs",
    "/guilds/:guildId/notifications/jobs",
    {
      params: OrganizationNotificationParams,
      success: NotificationJobsResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsGuildController_getGuildJobs")
    .annotate(OpenApi.Summary, "Get guild notification jobs")
    .annotate(OpenApi.Description, "Pending and recent jobs."),
  HttpApiEndpoint.delete(
    "NotificationsGuildControllerCancelGuildJob",
    "/guilds/:guildId/notifications/jobs/:jobId",
    {
      params: OrganizationNotificationJobParams,
      success: SuccessResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsGuildController_cancelGuildJob")
    .annotate(OpenApi.Summary, "Cancel guild notification job")
    .annotate(
      OpenApi.Description,
      "Only a pending or blocked job can be cancelled.",
    ),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetUserTargets",
    "/users/@me/notifications/targets",
    { success: UserNotificationTargetsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getUserTargets")
    .annotate(OpenApi.Summary, "Get user notification targets"),
  HttpApiEndpoint.post(
    "NotificationsUserControllerCreateUserTarget",
    "/users/@me/notifications/targets",
    {
      payload: CreateNotificationTargetRequest,
      success: NotificationTargetResponse.pipe(HttpApiSchema.status(201)),
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(400))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_createUserTarget",
    )
    .annotate(OpenApi.Summary, "Create or reactivate user notification target"),
  HttpApiEndpoint.delete(
    "NotificationsUserControllerDeleteUserTarget",
    "/users/@me/notifications/targets/:targetId",
    {
      params: NotificationTargetParams,
      success: SuccessResponse,
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_deleteUserTarget",
    )
    .annotate(OpenApi.Summary, "Delete user notification target"),
  HttpApiEndpoint.patch(
    "NotificationsUserControllerUpdateUserTarget",
    "/users/@me/notifications/targets/:targetId",
    {
      params: NotificationTargetParams,
      payload: UpdateNotificationTargetRequest,
      success: NotificationTargetResponse,
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_updateUserTarget",
    )
    .annotate(OpenApi.Summary, "Update user notification target"),
  HttpApiEndpoint.post(
    "NotificationsUserControllerTriggerUserTargetTest",
    "/users/@me/notifications/targets/:targetId/test",
    {
      params: NotificationTargetParams,
      success: SuccessResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_triggerUserTargetTest",
    )
    .annotate(OpenApi.Summary, "Trigger user notification target test"),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetUserRules",
    "/users/@me/notifications/rules",
    { success: NotificationRulesResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getUserRules")
    .annotate(OpenApi.Summary, "Get user notification rules"),
  HttpApiEndpoint.post(
    "NotificationsUserControllerCreateUserRule",
    "/users/@me/notifications/rules",
    {
      payload: CreateNotificationRuleRequest,
      success: NotificationRuleResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_createUserRule")
    .annotate(OpenApi.Summary, "Create user notification rule"),
  HttpApiEndpoint.delete(
    "NotificationsUserControllerDeleteUserRule",
    "/users/@me/notifications/rules/:ruleId",
    {
      params: NotificationRuleParams,
      success: SuccessResponse,
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_deleteUserRule")
    .annotate(OpenApi.Summary, "Delete user notification rule"),
  HttpApiEndpoint.patch(
    "NotificationsUserControllerUpdateUserRule",
    "/users/@me/notifications/rules/:ruleId",
    {
      params: NotificationRuleParams,
      payload: UpdateNotificationRuleRequest,
      success: NotificationRuleResponse,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_updateUserRule")
    .annotate(OpenApi.Summary, "Update user notification rule"),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetUserJobs",
    "/users/@me/notifications/jobs",
    { success: NotificationJobsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getUserJobs")
    .annotate(OpenApi.Summary, "Get user notification jobs")
    .annotate(OpenApi.Description, "Pending and recent jobs."),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetWatchedItems",
    "/users/@me/notifications/watched-items",
    { success: WatchedItemsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getWatchedItems")
    .annotate(OpenApi.Summary, "Get watched items"),
  HttpApiEndpoint.post(
    "NotificationsUserControllerCreateWatchedItem",
    "/users/@me/notifications/watched-items",
    {
      payload: CreateWatchedItemRequest,
      success: WatchedItemResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_createWatchedItem",
    )
    .annotate(OpenApi.Summary, "Create or reactivate watched item"),
  HttpApiEndpoint.post(
    "NotificationsUserControllerQuickAddWatchedItem",
    "/users/@me/notifications/watched-items/quick-add",
    {
      payload: QuickAddWatchedItemRequest,
      success: WatchedItemResponse.pipe(HttpApiSchema.status(201)),
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
      ],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_quickAddWatchedItem",
    )
    .annotate(OpenApi.Summary, "Quick add watched item")
    .annotate(OpenApi.Description, "Adds a guild scope to a watched item."),
  HttpApiEndpoint.delete(
    "NotificationsUserControllerDeleteWatchedItem",
    "/users/@me/notifications/watched-items/:watchedItemId",
    {
      params: WatchedItemParams,
      success: SuccessResponse,
      error: [HttpErrorResponse.pipe(HttpApiSchema.status(404))],
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_deleteWatchedItem",
    )
    .annotate(OpenApi.Summary, "Delete watched item"),
) {}
