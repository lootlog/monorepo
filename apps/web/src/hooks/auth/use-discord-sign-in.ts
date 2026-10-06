import { authClient } from "@/lib/auth-client";
import { useRef, useState } from "react";

type SignInOptions = Pick<
  Parameters<typeof authClient.signIn.social>[0],
  "callbackURL" | "errorCallbackURL" | "scopes"
>;

export const useDiscordSignIn = () => {
  const attemptPending = useRef(false);
  const [status, setStatus] = useState<"idle" | "pending" | "failed">("idle");

  const signIn = async (options: SignInOptions) => {
    if (attemptPending.current) return;

    attemptPending.current = true;
    setStatus("pending");

    try {
      const session = await authClient.getSession({
        query: { disableCookieCache: true },
      });

      if (session.error && session.error.status !== 401) {
        attemptPending.current = false;
        setStatus("failed");

        return;
      }

      const oauthOptions = { ...options, provider: "discord" as const };

      // Better Auth updates existing account scopes only through account linking.
      const result = session.data
        ? await authClient.linkSocial(oauthOptions)
        : await authClient.signIn.social(oauthOptions);

      // Keep successful OAuth initiation locked until the redirect unloads the page.
      if (!result.error) return;

      if (session.data && result.error.status === 401) {
        const signInResult = await authClient.signIn.social(oauthOptions);

        if (!signInResult.error) return;
      }
    } catch {
      // Network failures and HTTP errors share the same visible retry state.
    }

    attemptPending.current = false;
    setStatus("failed");
  };

  return {
    signIn,
    isPending: status === "pending",
    hasError: status === "failed",
  };
};
