import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignIn } from "@/features/signin/signin";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { SigninPageSkeleton } from "@/features/signin/signin-page-skeleton";
import { restoreLastOrganization } from "@/lib/router/restore-last-organization";

import { z } from "zod";

const signinSearch = z.object({
  error: z.string().optional().catch(undefined),
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/signin")({
  component: SignIn,
  pendingComponent: SigninPageSkeleton,
  validateSearch: signinSearch.parse,
  beforeLoad: async ({ context, search, preload, abortController }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session?.data?.session && !search.error) {
      if (search.redirect) {
        throw redirect({ to: search.redirect, replace: true });
      }

      const guildId = preload
        ? null
        : await restoreLastOrganization({
            queryClient: context.queryClient,
            userId: session.data.user.id,
            abortController,
          });

      if (abortController.signal.aborted) return;

      if (guildId) {
        throw redirect({
          to: "/$guildId",
          params: { guildId },
          replace: true,
        });
      }

      throw redirect({
        to: "/@me",
        replace: true,
      });
    }
  },
});
