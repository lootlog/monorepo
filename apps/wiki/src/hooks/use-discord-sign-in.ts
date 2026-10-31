import { useState } from "react";
import { useWikiContext } from "@/contexts/wiki-context";

export const useDiscordSignIn = () => {
  const { authClient } = useWikiContext();
  const [status, setStatus] = useState<"idle" | "pending" | "failed">("idle");

  const signIn = async () => {
    if (status === "pending") return;

    setStatus("pending");

    try {
      // Returns to the page the User signed in from.
      const result = await authClient.signIn.social({
        provider: "discord",
        callbackURL: window.location.href,
      });

      // A started sign-in stays pending until the redirect unloads the page.
      if (!result.error) return;
    } catch {
      // Network failures and HTTP errors share the same visible retry state.
    }

    setStatus("failed");
  };

  return {
    signIn,
    isPending: status === "pending",
    hasError: status === "failed",
  };
};
