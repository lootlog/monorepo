import { Button } from "@lootlog/ui/components/button";
import { PageState } from "@lootlog/ui/components/page-state";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { LogIn, ShieldX } from "lucide-react";
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

function SignInPage() {
  const { webUrl } = Route.useLoaderData();
  const { reason } = Route.useSearch();
  const notAdmin = reason === "not-admin";

  return (
    <PageState
      icon={notAdmin ? <ShieldX /> : <LogIn />}
      title={notAdmin ? text.notAdminTitle : text.signInTitle}
      description={notAdmin ? text.notAdminDescription : text.signInDescription}
    >
      <Button nativeButton={false} render={<a href={webUrl} />}>
        {text.signInOpen}
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link to="/" reloadDocument />}
      >
        {text.retry}
      </Button>
    </PageState>
  );
}
