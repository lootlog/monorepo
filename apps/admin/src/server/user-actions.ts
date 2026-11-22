import {
  adminControllerBanUser,
  adminControllerRevokeUserApiKey,
  adminControllerRevokeUserSession,
  adminControllerRevokeUserSessions,
  adminControllerSetUserRoles,
  adminControllerUnbanUser,
} from "@lootlog/client/auth";
import { type UserAction, banExpiry } from "@/lib/user-action";
import { asPanel } from "./auth-api.js";

export const runUserAction = async (id: string, action: UserAction) => {
  switch (action.action) {
    case "roles":
      await adminControllerSetUserRoles(
        { id },
        { roles: [...action.roles] },
        asPanel(),
      );
      break;
    case "ban":
      await adminControllerBanUser(
        { id },
        {
          reason: action.reason,
          expiresAt: banExpiry(action.duration, Date.now()),
        },
        asPanel(),
      );
      break;
    case "unban":
      await adminControllerUnbanUser({ id }, asPanel());
      break;
    case "revoke-sessions":
      await adminControllerRevokeUserSessions({ id }, asPanel());
      break;
    case "revoke-session":
      await adminControllerRevokeUserSession(
        { id, sessionId: action.sessionId },
        asPanel(),
      );
      break;
    case "revoke-api-key":
      await adminControllerRevokeUserApiKey(
        { id, keyId: action.keyId },
        asPanel(),
      );
      break;
  }
};
