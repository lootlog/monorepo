export type LoginState =
  | "signedIn"
  | "reauthRequired"
  | "checking"
  | "checkFailed"
  | "signedOut"
  | "cookiesBlocked";

export const resolveLoginState = ({
  extension,
  websiteOpened,
  reauthentication,
  session,
}: {
  extension: boolean;
  websiteOpened: boolean;
  reauthentication: { required: boolean; checking: boolean };
  session: {
    data: unknown;
    error: unknown;
    isPending: boolean;
    isRefetching: boolean;
  };
}): LoginState => {
  if (session.data && !reauthentication.required) return "signedIn";

  if (session.isPending || session.isRefetching || reauthentication.checking)
    return "checking";

  if (session.data) return "reauthRequired";

  if (session.error) return "checkFailed";

  return websiteOpened && !extension ? "cookiesBlocked" : "signedOut";
};
