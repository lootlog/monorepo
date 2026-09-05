import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@lootlog/client/transport";
import { getUserNotificationsErrorMessage } from "./get-user-notifications-error-message";

describe("notification rejection messages", () => {
  it.each([
    ["ACTIVE_DISCORD_DM_TARGET_REQUIRED", "dmRequired"],
    [
      "SELECTED_GUILDS_NOT_AVAILABLE_FOR_AUTHENTICATED_USER",
      "guildSelectionUnavailable",
    ],
    ["USER_DM_TEST_TRIGGER_LIMIT_REACHED", "dmTestLimitReached"],
    ["USER_WATCHED_ITEM_LIMIT_REACHED", "watchLimitReached"],
  ])("translates %s from the API response body", (message, key) => {
    const translate = vi.fn((value: string) => `translated:${value}`);
    const error = new ApiError({
      data: { message },
      message: "Conflict",
      method: "POST",
      status: 409,
      url: "https://example.test/users/@me/notifications",
    });
    expect(getUserNotificationsErrorMessage(error, translate)).toBe(
      `translated:settings.userNotifications.validation.${key}`,
    );
  });
});
