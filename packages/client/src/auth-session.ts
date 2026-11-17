import { useQueryClient } from "@tanstack/react-query";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { useRef, useState } from "react";

/** The Better Auth client of `apps/auth`, which serves it under `/idp`. */
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

/**
 * Starts Discord sign-in once per attempt. A signed-in User links the account
 * instead, because Better Auth updates the scopes of an existing account only
 * through account linking.
 */
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

/**
 * Signs out once per attempt and clears every cached response, which belonged
 * to the signed-out User.
 */
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
