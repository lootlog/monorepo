import type { LoginHandoff } from "@/hooks/auth/login-handoff";

/**
 * What the login window tells the player.
 *
 * - `checkFailed`: the session request itself failed (network or a 5xx),
 *   so the client cannot tell whether the player is signed in.
 * - `cookiesBlocked`: the web app confirmed a signed-in User and the auth
 *   service accepted the handoff, yet this page still reads no session, so
 *   the browser refuses Lootlog's cookie even when partitioned.
 */
export type LoginState =
  | "signedIn"
  | "checking"
  | "checkFailed"
  | "signedOut"
  | "awaitingPopup"
  | "popupBlocked"
  | "connecting"
  | "handoffExpired"
  | "handoffFailed"
  | "cookiesBlocked";

export const resolveLoginState = ({
  handoff,
  session,
}: {
  handoff: LoginHandoff;
  session: {
    data: unknown;
    error: unknown;
    isPending: boolean;
    isRefetching: boolean;
  };
}): LoginState => {
  if (session.data) return "signedIn";

  if (handoff.status === "exchanging") return "connecting";

  if (session.isPending || session.isRefetching)
    return handoff.status === "exchanged" ? "connecting" : "checking";

  if (session.error) return "checkFailed";

  switch (handoff.status) {
    case "exchanged":
      return "cookiesBlocked";
    case "failed":
      return handoff.reason === "expired" ? "handoffExpired" : "handoffFailed";
    case "waiting":
      return handoff.popupBlocked ? "popupBlocked" : "awaitingPopup";
    case "idle":
      return "signedOut";
  }
};
