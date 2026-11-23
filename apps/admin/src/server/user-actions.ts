import { type UserAction, banExpiry } from "@/lib/user-action";
import { grantPersonalAura, revokePersonalAuras } from "./character-auras.js";
import { setUserEntitlement } from "./user-plans.js";
import { asOperator } from "./rpc.js";

export const runUserAction = async (userId: string, action: UserAction) => {
  switch (action.action) {
    case "roles":
      await asOperator(({ auth }, session) =>
        auth.setUserRoles({ ...session, userId, roles: action.roles }),
      );
      break;
    case "ban":
      await asOperator(({ auth }, session) =>
        auth.banUser({
          ...session,
          userId,
          reason: action.reason,
          expiresAt: banExpiry(action.duration, Date.now()),
        }),
      );
      break;
    case "unban":
      await asOperator(({ auth }, session) =>
        auth.unbanUser({ ...session, userId }),
      );
      break;
    case "revoke-sessions":
      await asOperator(({ auth }, session) =>
        auth.revokeUserSessions({ ...session, userId }),
      );
      break;
    case "revoke-session":
      await asOperator(({ auth }, session) =>
        auth.revokeUserSession({
          ...session,
          userId,
          sessionId: action.sessionId,
        }),
      );
      break;
    case "revoke-api-key":
      await asOperator(({ auth }, session) =>
        auth.revokeUserApiKey({ ...session, userId, keyId: action.keyId }),
      );
      break;
    case "plan":
      await setUserEntitlement(userId, action.change);
      break;
    case "grant-personal-aura":
      await grantPersonalAura(userId, action.auraId);
      break;
    case "revoke-personal-auras":
      await revokePersonalAuras(userId);
      break;
  }
};
