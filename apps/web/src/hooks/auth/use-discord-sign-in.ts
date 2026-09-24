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
      const result = await authClient.signIn.social({
        ...options,
        provider: "discord",
      });

      // Keep successful OAuth initiation locked until the redirect unloads the page.
      if (!result.error) return;
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
