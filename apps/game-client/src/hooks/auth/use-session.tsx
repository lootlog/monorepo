import { authClient } from "@/lib/auth-client";
import i18n from "@/i18n/config";

let messageSent = false;

export const useSession = () => {
  const session = authClient.useSession();

  if (!session.data && !session.isPending && !messageSent) {
    messageSent = true;
    window.message(i18n.t("settings.auth.loginRequired"));
  }

  return session;
};
