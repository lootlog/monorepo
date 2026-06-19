import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignIn } from "@/features/signin/signin";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { SigninPageSkeleton } from "@/features/signin/signin-page-skeleton";

const validateSigninSearch = (
  search: Record<string, unknown>,
): { redirect?: string } => {
  if (typeof search.redirect === "string") {
    return { redirect: search.redirect };
  }

  return {};
};

export const Route = createFileRoute("/signin")({
  component: SignIn,
  pendingComponent: SigninPageSkeleton,
  validateSearch: validateSigninSearch,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session?.data?.session) {
      throw redirect({
        to: search.redirect ?? "/",
      });
    }
  },
});
