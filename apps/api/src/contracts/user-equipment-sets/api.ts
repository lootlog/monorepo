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
  CreateUserEquipmentSetRequest,
  UpdateUserEquipmentSetRequest,
  UserEquipmentSetParams,
  UserEquipmentSetResponse,
  UserEquipmentSetsResponse,
} from "./schemas.js";

export class UserEquipmentSetsGroup extends HttpApiGroup.make(
  "user-equipment-sets",
).add(
  HttpApiEndpoint.get(
    "UserEquipmentSetsControllerGetSets",
    "/users/@me/equipment-sets",
    { success: UserEquipmentSetsResponse },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserEquipmentSetsController_getSets")
    .annotate(OpenApi.Summary, "Get saved equipment sets")
    .annotate(
      OpenApi.Description,
      "List the authenticated user's saved wiki equipment sets, own characters and opponents, oldest first",
    ),
  HttpApiEndpoint.post(
    "UserEquipmentSetsControllerCreateSet",
    "/users/@me/equipment-sets",
    {
      payload: CreateUserEquipmentSetRequest,
      success: UserEquipmentSetResponse.pipe(HttpApiSchema.status(201)),
      error: HttpErrorResponse.pipe(HttpApiSchema.status(409)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserEquipmentSetsController_createSet")
    .annotate(OpenApi.Summary, "Save equipment set")
    .annotate(
      OpenApi.Description,
      "Save a wiki equipment set for the authenticated user; fails with 409 once the user has reached the equipment set limit",
    ),
  HttpApiEndpoint.patch(
    "UserEquipmentSetsControllerUpdateSet",
    "/users/@me/equipment-sets/:setId",
    {
      params: UserEquipmentSetParams,
      payload: UpdateUserEquipmentSetRequest,
      success: UserEquipmentSetResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserEquipmentSetsController_updateSet")
    .annotate(OpenApi.Summary, "Update saved equipment set")
    .annotate(
      OpenApi.Description,
      "Rename a saved equipment set or overwrite its contents",
    ),
  HttpApiEndpoint.delete(
    "UserEquipmentSetsControllerDeleteSet",
    "/users/@me/equipment-sets/:setId",
    {
      params: UserEquipmentSetParams,
      success: SuccessResponse,
      error: HttpErrorResponse.pipe(HttpApiSchema.status(404)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "UserEquipmentSetsController_deleteSet")
    .annotate(OpenApi.Summary, "Delete saved equipment set"),
) {}
