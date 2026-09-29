/**
 * What the login window tells the player.
 *
 * - `checkFailed`: the session request itself failed (network or a 5xx),
 *   so the client cannot tell whether the player is signed in.
 * - `cookiesBlocked`: the player opened the website from the login window
 *   and came back, yet the userscript still reads no session. The usual
 *   cause is a browser that withholds Lootlog's cookie from the Margonem
 *   page as a third-party cookie. The extension reads the session through
 *   its background worker, so it never lands here.
 */
export type LoginState =
  | "signedIn"
  | "checking"
  | "checkFailed"
  | "signedOut"
  | "cookiesBlocked";

export const resolveLoginState = ({
  extension,
  websiteOpened,
  session,
}: {
  extension: boolean;
  websiteOpened: boolean;
  session: {
    data: unknown;
    error: unknown;
    isPending: boolean;
    isRefetching: boolean;
  };
}): LoginState => {
  if (session.data) return "signedIn";

  if (session.isPending || session.isRefetching) return "checking";

  if (session.error) return "checkFailed";

  return websiteOpened && !extension ? "cookiesBlocked" : "signedOut";
};
