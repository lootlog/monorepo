import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignIn } from "@/features/signin/signin";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { SigninPageSkeleton } from "@/features/signin/signin-page-skeleton";

import { z } from "zod";

const signinSearch = z.object({
  error: z.string().optional().catch(undefined),
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/signin")({
  component: SignIn,
  pendingComponent: SigninPageSkeleton,
  validateSearch: signinSearch.parse,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session?.data?.session && !search.error) {
      throw redirect({
        to: search.redirect ?? "/",
      });
    }
  },
});
