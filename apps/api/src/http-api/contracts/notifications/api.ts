/** Endpoints owned by the notifications HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  NotificationsGuildControllerCancelGuildJob200,
  NotificationsGuildControllerCancelGuildJobPathParams,
  NotificationsGuildControllerCreateGuildRule201,
  NotificationsGuildControllerCreateGuildRulePathParams,
  NotificationsGuildControllerCreateGuildRuleRequestJson,
  NotificationsGuildControllerCreateGuildTarget201,
  NotificationsGuildControllerCreateGuildTargetPathParams,
  NotificationsGuildControllerCreateGuildTargetRequestJson,
  NotificationsGuildControllerDeleteGuildRule200,
  NotificationsGuildControllerDeleteGuildRulePathParams,
  NotificationsGuildControllerDeleteGuildTarget200,
  NotificationsGuildControllerDeleteGuildTargetPathParams,
  NotificationsGuildControllerGetAvailableGuildTargets200,
  NotificationsGuildControllerGetAvailableGuildTargetsPathParams,
  NotificationsGuildControllerGetGuildJobs200,
  NotificationsGuildControllerGetGuildJobsPathParams,
  NotificationsGuildControllerGetGuildRules200,
  NotificationsGuildControllerGetGuildRulesPathParams,
  NotificationsGuildControllerGetGuildTargets200,
  NotificationsGuildControllerGetGuildTargetsPathParams,
  NotificationsGuildControllerRebuildGuildRuleJobs201,
  NotificationsGuildControllerRebuildGuildRuleJobsPathParams,
  NotificationsGuildControllerTriggerGuildRuleTest201,
  NotificationsGuildControllerTriggerGuildRuleTestPathParams,
  NotificationsGuildControllerUpdateGuildRule200,
  NotificationsGuildControllerUpdateGuildRulePathParams,
  NotificationsGuildControllerUpdateGuildRuleRequestJson,
  NotificationsGuildControllerUpdateGuildTarget200,
  NotificationsGuildControllerUpdateGuildTargetPathParams,
  NotificationsGuildControllerUpdateGuildTargetRequestJson,
  NotificationsUserControllerCreateUserRule201,
  NotificationsUserControllerCreateUserRuleRequestJson,
  NotificationsUserControllerCreateUserTarget201,
  NotificationsUserControllerCreateUserTargetRequestJson,
  NotificationsUserControllerCreateWatchedItem201,
  NotificationsUserControllerCreateWatchedItemRequestJson,
  NotificationsUserControllerDeleteUserRule200,
  NotificationsUserControllerDeleteUserRulePathParams,
  NotificationsUserControllerDeleteUserTarget200,
  NotificationsUserControllerDeleteUserTargetPathParams,
  NotificationsUserControllerDeleteWatchedItem200,
  NotificationsUserControllerDeleteWatchedItemPathParams,
  NotificationsUserControllerGetUserJobs200,
  NotificationsUserControllerGetUserRules200,
  NotificationsUserControllerGetUserTargets200,
  NotificationsUserControllerGetWatchedItems200,
  NotificationsUserControllerQuickAddWatchedItem201,
  NotificationsUserControllerQuickAddWatchedItemRequestJson,
  NotificationsUserControllerTriggerUserTargetTest201,
  NotificationsUserControllerTriggerUserTargetTestPathParams,
  NotificationsUserControllerUpdateUserRule200,
  NotificationsUserControllerUpdateUserRulePathParams,
  NotificationsUserControllerUpdateUserRuleRequestJson,
  NotificationsUserControllerUpdateUserTarget200,
  NotificationsUserControllerUpdateUserTargetPathParams,
  NotificationsUserControllerUpdateUserTargetRequestJson,
} from "./schemas.js";

export class NotificationsGroup extends HttpApiGroup.make("notifications").add(
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetGuildTargets",
    "/guilds/:guildId/notifications/targets",
    {
      params: NotificationsGuildControllerGetGuildTargetsPathParams,
      success: NotificationsGuildControllerGetGuildTargets200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_getGuildTargets",
    )
    .annotate(OpenApi.Summary, "Get guild notification targets")
    .annotate(
      OpenApi.Description,
      "Retrieve configured notification targets for a guild",
    ),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerCreateGuildTarget",
    "/guilds/:guildId/notifications/targets",
    {
      params: NotificationsGuildControllerCreateGuildTargetPathParams,
      payload: NotificationsGuildControllerCreateGuildTargetRequestJson,
      success: NotificationsGuildControllerCreateGuildTarget201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_createGuildTarget",
    )
    .annotate(OpenApi.Summary, "Create guild notification target")
    .annotate(
      OpenApi.Description,
      "Create or reactivate a guild notification target",
    ),
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetAvailableGuildTargets",
    "/guilds/:guildId/notifications/targets/available",
    {
      params: NotificationsGuildControllerGetAvailableGuildTargetsPathParams,
      success: NotificationsGuildControllerGetAvailableGuildTargets200,
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
      "Retrieve selectable Discord channels for guild notifications",
    ),
  HttpApiEndpoint.delete(
    "NotificationsGuildControllerDeleteGuildTarget",
    "/guilds/:guildId/notifications/targets/:targetId",
    {
      params: NotificationsGuildControllerDeleteGuildTargetPathParams,
      success: NotificationsGuildControllerDeleteGuildTarget200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_deleteGuildTarget",
    )
    .annotate(OpenApi.Summary, "Delete guild notification target")
    .annotate(OpenApi.Description, "Delete a guild notification target"),
  HttpApiEndpoint.patch(
    "NotificationsGuildControllerUpdateGuildTarget",
    "/guilds/:guildId/notifications/targets/:targetId",
    {
      params: NotificationsGuildControllerUpdateGuildTargetPathParams,
      payload: NotificationsGuildControllerUpdateGuildTargetRequestJson,
      success: NotificationsGuildControllerUpdateGuildTarget200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_updateGuildTarget",
    )
    .annotate(OpenApi.Summary, "Update guild notification target")
    .annotate(OpenApi.Description, "Update a guild notification target"),
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetGuildRules",
    "/guilds/:guildId/notifications/rules",
    {
      params: NotificationsGuildControllerGetGuildRulesPathParams,
      success: NotificationsGuildControllerGetGuildRules200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsGuildController_getGuildRules")
    .annotate(OpenApi.Summary, "Get guild notification rules")
    .annotate(
      OpenApi.Description,
      "Retrieve configured notification rules for a guild",
    ),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerCreateGuildRule",
    "/guilds/:guildId/notifications/rules",
    {
      params: NotificationsGuildControllerCreateGuildRulePathParams,
      payload: NotificationsGuildControllerCreateGuildRuleRequestJson,
      success: NotificationsGuildControllerCreateGuildRule201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_createGuildRule",
    )
    .annotate(OpenApi.Summary, "Create guild notification rule")
    .annotate(OpenApi.Description, "Create a guild notification rule"),
  HttpApiEndpoint.delete(
    "NotificationsGuildControllerDeleteGuildRule",
    "/guilds/:guildId/notifications/rules/:ruleId",
    {
      params: NotificationsGuildControllerDeleteGuildRulePathParams,
      success: NotificationsGuildControllerDeleteGuildRule200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_deleteGuildRule",
    )
    .annotate(OpenApi.Summary, "Delete guild notification rule")
    .annotate(OpenApi.Description, "Delete a guild notification rule"),
  HttpApiEndpoint.patch(
    "NotificationsGuildControllerUpdateGuildRule",
    "/guilds/:guildId/notifications/rules/:ruleId",
    {
      params: NotificationsGuildControllerUpdateGuildRulePathParams,
      payload: NotificationsGuildControllerUpdateGuildRuleRequestJson,
      success: NotificationsGuildControllerUpdateGuildRule200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_updateGuildRule",
    )
    .annotate(OpenApi.Summary, "Update guild notification rule")
    .annotate(OpenApi.Description, "Update a guild notification rule"),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerRebuildGuildRuleJobs",
    "/guilds/:guildId/notifications/rules/:ruleId/rebuild-jobs",
    {
      params: NotificationsGuildControllerRebuildGuildRuleJobsPathParams,
      success: NotificationsGuildControllerRebuildGuildRuleJobs201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_rebuildGuildRuleJobs",
    )
    .annotate(OpenApi.Summary, "Rebuild guild notification jobs")
    .annotate(
      OpenApi.Description,
      "Rebuild pending jobs for a guild notification rule",
    ),
  HttpApiEndpoint.post(
    "NotificationsGuildControllerTriggerGuildRuleTest",
    "/guilds/:guildId/notifications/rules/:ruleId/test",
    {
      params: NotificationsGuildControllerTriggerGuildRuleTestPathParams,
      success: NotificationsGuildControllerTriggerGuildRuleTest201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsGuildController_triggerGuildRuleTest",
    )
    .annotate(OpenApi.Summary, "Trigger guild notification rule test")
    .annotate(
      OpenApi.Description,
      "Trigger a test notification for a guild rule",
    ),
  HttpApiEndpoint.get(
    "NotificationsGuildControllerGetGuildJobs",
    "/guilds/:guildId/notifications/jobs",
    {
      params: NotificationsGuildControllerGetGuildJobsPathParams,
      success: NotificationsGuildControllerGetGuildJobs200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsGuildController_getGuildJobs")
    .annotate(OpenApi.Summary, "Get guild notification jobs")
    .annotate(
      OpenApi.Description,
      "Retrieve pending and recent notification jobs for a guild",
    ),
  HttpApiEndpoint.delete(
    "NotificationsGuildControllerCancelGuildJob",
    "/guilds/:guildId/notifications/jobs/:jobId",
    {
      params: NotificationsGuildControllerCancelGuildJobPathParams,
      success: NotificationsGuildControllerCancelGuildJob200,
      error: HttpApiSchema.Empty(400),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsGuildController_cancelGuildJob")
    .annotate(OpenApi.Summary, "Cancel guild notification job")
    .annotate(
      OpenApi.Description,
      "Cancel a pending or blocked guild notification job",
    ),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetUserTargets",
    "/users/@me/notifications/targets",
    { success: NotificationsUserControllerGetUserTargets200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getUserTargets")
    .annotate(OpenApi.Summary, "Get user notification targets")
    .annotate(
      OpenApi.Description,
      "Retrieve configured notification targets for the authenticated user",
    ),
  HttpApiEndpoint.post(
    "NotificationsUserControllerCreateUserTarget",
    "/users/@me/notifications/targets",
    {
      payload: NotificationsUserControllerCreateUserTargetRequestJson,
      success: NotificationsUserControllerCreateUserTarget201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_createUserTarget",
    )
    .annotate(OpenApi.Summary, "Create user notification target")
    .annotate(
      OpenApi.Description,
      "Create or reactivate a notification target for the authenticated user",
    ),
  HttpApiEndpoint.delete(
    "NotificationsUserControllerDeleteUserTarget",
    "/users/@me/notifications/targets/:targetId",
    {
      params: NotificationsUserControllerDeleteUserTargetPathParams,
      success: NotificationsUserControllerDeleteUserTarget200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_deleteUserTarget",
    )
    .annotate(OpenApi.Summary, "Delete user notification target")
    .annotate(OpenApi.Description, "Delete a user notification target"),
  HttpApiEndpoint.patch(
    "NotificationsUserControllerUpdateUserTarget",
    "/users/@me/notifications/targets/:targetId",
    {
      params: NotificationsUserControllerUpdateUserTargetPathParams,
      payload: NotificationsUserControllerUpdateUserTargetRequestJson,
      success: NotificationsUserControllerUpdateUserTarget200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_updateUserTarget",
    )
    .annotate(OpenApi.Summary, "Update user notification target")
    .annotate(OpenApi.Description, "Update a user notification target"),
  HttpApiEndpoint.post(
    "NotificationsUserControllerTriggerUserTargetTest",
    "/users/@me/notifications/targets/:targetId/test",
    {
      params: NotificationsUserControllerTriggerUserTargetTestPathParams,
      success: NotificationsUserControllerTriggerUserTargetTest201.pipe(
        HttpApiSchema.status(201),
      ),
      error: HttpApiSchema.Empty(409),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_triggerUserTargetTest",
    )
    .annotate(OpenApi.Summary, "Trigger user notification target test")
    .annotate(
      OpenApi.Description,
      "Trigger a test notification for a user target",
    ),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetUserRules",
    "/users/@me/notifications/rules",
    { success: NotificationsUserControllerGetUserRules200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getUserRules")
    .annotate(OpenApi.Summary, "Get user notification rules")
    .annotate(
      OpenApi.Description,
      "Retrieve configured notification rules for the authenticated user",
    ),
  HttpApiEndpoint.post(
    "NotificationsUserControllerCreateUserRule",
    "/users/@me/notifications/rules",
    {
      payload: NotificationsUserControllerCreateUserRuleRequestJson,
      success: NotificationsUserControllerCreateUserRule201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_createUserRule")
    .annotate(OpenApi.Summary, "Create user notification rule")
    .annotate(OpenApi.Description, "Create a user notification rule"),
  HttpApiEndpoint.delete(
    "NotificationsUserControllerDeleteUserRule",
    "/users/@me/notifications/rules/:ruleId",
    {
      params: NotificationsUserControllerDeleteUserRulePathParams,
      success: NotificationsUserControllerDeleteUserRule200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_deleteUserRule")
    .annotate(OpenApi.Summary, "Delete user notification rule")
    .annotate(OpenApi.Description, "Delete a user notification rule"),
  HttpApiEndpoint.patch(
    "NotificationsUserControllerUpdateUserRule",
    "/users/@me/notifications/rules/:ruleId",
    {
      params: NotificationsUserControllerUpdateUserRulePathParams,
      payload: NotificationsUserControllerUpdateUserRuleRequestJson,
      success: NotificationsUserControllerUpdateUserRule200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_updateUserRule")
    .annotate(OpenApi.Summary, "Update user notification rule")
    .annotate(OpenApi.Description, "Update a user notification rule"),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetUserJobs",
    "/users/@me/notifications/jobs",
    { success: NotificationsUserControllerGetUserJobs200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getUserJobs")
    .annotate(OpenApi.Summary, "Get user notification jobs")
    .annotate(
      OpenApi.Description,
      "Retrieve pending and recent notification jobs for the authenticated user",
    ),
  HttpApiEndpoint.get(
    "NotificationsUserControllerGetWatchedItems",
    "/users/@me/notifications/watched-items",
    { success: NotificationsUserControllerGetWatchedItems200 },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "NotificationsUserController_getWatchedItems")
    .annotate(OpenApi.Summary, "Get watched items")
    .annotate(
      OpenApi.Description,
      "Retrieve watched items for the authenticated user",
    ),
  HttpApiEndpoint.post(
    "NotificationsUserControllerCreateWatchedItem",
    "/users/@me/notifications/watched-items",
    {
      payload: NotificationsUserControllerCreateWatchedItemRequestJson,
      success: NotificationsUserControllerCreateWatchedItem201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_createWatchedItem",
    )
    .annotate(OpenApi.Summary, "Create watched item")
    .annotate(
      OpenApi.Description,
      "Create or reactivate a watched item for the authenticated user",
    ),
  HttpApiEndpoint.post(
    "NotificationsUserControllerQuickAddWatchedItem",
    "/users/@me/notifications/watched-items/quick-add",
    {
      payload: NotificationsUserControllerQuickAddWatchedItemRequestJson,
      success: NotificationsUserControllerQuickAddWatchedItem201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_quickAddWatchedItem",
    )
    .annotate(OpenApi.Summary, "Quick add watched item")
    .annotate(
      OpenApi.Description,
      "Add a guild scope to a watched item for the authenticated user",
    ),
  HttpApiEndpoint.delete(
    "NotificationsUserControllerDeleteWatchedItem",
    "/users/@me/notifications/watched-items/:watchedItemId",
    {
      params: NotificationsUserControllerDeleteWatchedItemPathParams,
      success: NotificationsUserControllerDeleteWatchedItem200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(
      OpenApi.Identifier,
      "NotificationsUserController_deleteWatchedItem",
    )
    .annotate(OpenApi.Summary, "Delete watched item")
    .annotate(
      OpenApi.Description,
      "Delete a watched item for the authenticated user",
    ),
) {}
