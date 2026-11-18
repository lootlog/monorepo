import { useLogout as useAuthLogout } from "@lootlog/client/auth-session";
import { authClient } from "@/lib/auth-client";

const leaveSignedOutUser = () => window.location.replace("/");

export const useLogout = () =>
  useAuthLogout(authClient, { afterSignOut: leaveSignedOutUser });
