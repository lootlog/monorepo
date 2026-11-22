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
