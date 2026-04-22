import { authClient } from "@/lib/auth-client";
import { getFixedT } from "@/i18n/get-fixed-t";

let messageSent = false;

export const useSession = () => {
  const t = getFixedT("common");
  const session = authClient.useSession();

  if (!session.data && !session.isPending && !messageSent) {
    messageSent = true;
    window.message(t("auth.notLoggedIn"));
  }

  return session;
};
