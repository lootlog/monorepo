import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  deleteCurrentAccountHttpResponse,
  getCurrentUserGamePreferences,
  getCurrentUserGuilds,
  getCurrentUserPreferences,
  toAccountOrganizationHttpResponse,
  updateCurrentUserGamePreferences,
  updateCurrentUserPreferences,
} from "../account-organization/account-organization.operations.js";

export const UsersHandlers = HttpApiBuilder.group(
  LootlogApi,
  "users",
  (handlers) =>
    handlers
      .handle("UsersControllerDeleteAccount", deleteCurrentAccountHttpResponse)
      .handle("UsersControllerGetUserPreferences", () =>
        toAccountOrganizationHttpResponse(getCurrentUserPreferences()),
      )
      .handle("UsersControllerUpdateUserPreferences", ({ payload }) =>
        toAccountOrganizationHttpResponse(
          updateCurrentUserPreferences(payload),
        ),
      )
      .handle("UsersControllerGetCurrentUserGuilds", () =>
        toAccountOrganizationHttpResponse(getCurrentUserGuilds()),
      )
      .handle("UsersControllerGetCurrentUserAccessibleGuilds", () =>
        toAccountOrganizationHttpResponse(getCurrentUserGuilds(true)),
      )
      .handle("UsersControllerGetUserGameAccountPreferences", ({ params }) =>
        toAccountOrganizationHttpResponse(
          getCurrentUserGamePreferences(params.accountId),
        ),
      )
      .handle(
        "UsersControllerUpdateUserGameAccountPreferences",
        ({ params, payload }) =>
          toAccountOrganizationHttpResponse(
            updateCurrentUserGamePreferences(params.accountId, payload),
          ),
      ),
);
