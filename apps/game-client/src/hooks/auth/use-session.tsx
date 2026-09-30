import { authClient } from "@/lib/auth-client";

/**
 * The Lootlog session for features. A missing or unreadable session is shown
 * by the login window, which tells a failed check apart from a signed-out
 * player, so features only read it.
 */
export const useSession = () => authClient.useSession();
