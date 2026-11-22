import { useQueryClient } from "@tanstack/react-query";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { useRef, useState } from "react";

export const createLootlogAuthClient = (
  authServiceUrl: string,
  options: { fetch?: typeof fetch } = {},
) =>
  createAuthClient({
    baseURL: `${authServiceUrl}/idp`,
    ...(options.fetch && {
      fetchOptions: { customFetchImpl: options.fetch },
    }),
    plugins: [
      inferAdditionalFields({
        user: { discordId: { type: "string", required: true } },
      }),
    ],
  });

export type LootlogAuthClient = ReturnType<typeof createLootlogAuthClient>;

type SignInOptions = Pick<
  Parameters<LootlogAuthClient["signIn"]["social"]>[0],
  "callbackURL" | "errorCallbackURL" | "scopes"
>;

export const useDiscordSignIn = (authClient: LootlogAuthClient) => {
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

      const result = session.data
        ? await authClient.linkSocial(oauthOptions)
        : await authClient.signIn.social(oauthOptions);

      if (!result.error) return;

      if (session.data && result.error.status === 401) {
        const signInResult = await authClient.signIn.social(oauthOptions);

        if (!signInResult.error) return;
      }
    } catch {}

    attemptPending.current = false;
    setStatus("failed");
  };

  return {
    signIn,
    isPending: status === "pending",
    hasError: status === "failed",
  };
};

export const useLogout = (
  authClient: LootlogAuthClient,
  options: { afterSignOut?: () => void } = {},
) => {
  const queryClient = useQueryClient();

  const [isPending, setIsPending] = useState(false);
  const attempt = useRef<Promise<void> | null>(null);

  const logout = () => {
    if (attempt.current) return attempt.current;
    setIsPending(true);
    attempt.current = Promise.resolve()
      .then(() => authClient.signOut())
      .then(() => {
        queryClient.clear();
        options.afterSignOut?.();
      })
      .finally(() => {
        attempt.current = null;
        setIsPending(false);
      });

    return attempt.current;
  };

  return { logout, isPending };
};
