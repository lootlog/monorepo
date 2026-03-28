import { createFileRoute, redirect } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { z } from "zod";

const signinSearchSchema = z.object({
  redirect: z.string().optional().catch("/"),
});

export const Route = createFileRoute("/signin")({
  validateSearch: signinSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.fetchQuery(sessionQueryOptions);

    if (session?.data?.session) {
      throw redirect({
        to: search.redirect ?? "/",
      });
    }
  },
});
