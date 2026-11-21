import { buttonVariants } from "@lootlog/ui/lib/button-variants";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { text } from "@/lib/messages";
import { getWebUrl } from "@/server/queries";

const readReason = Schema.decodeUnknownOption(
  Schema.Literals(["signed-out", "not-admin"]),
);

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: { reason?: unknown }) => ({
    reason: Option.getOrElse(
      readReason(search.reason),
      () => "signed-out" as const,
    ),
  }),
  loader: async () => ({ webUrl: await getWebUrl() }),
  component: SignInPage,
});

/** Shown instead of the panel until an admin account's session arrives. */
function SignInPage() {
  const { webUrl } = Route.useLoaderData();
  const { reason } = Route.useSearch();
  const notAdmin = reason === "not-admin";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div>
        <h1 className="text-lg font-semibold">
          {notAdmin ? text.notAdminTitle : text.signInTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {notAdmin ? text.notAdminDescription : text.signInDescription}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={webUrl} className={buttonVariants()}>
          {text.signInOpen}
        </a>
        <Link
          to="/"
          reloadDocument
          className={buttonVariants({ variant: "outline" })}
        >
          {text.signInRetry}
        </Link>
      </div>
    </div>
  );
}
